import {
  DEFAULT_EXPENSE_CATEGORIES,
  STAFF_PAYMENT_CATEGORY_ID,
  STAFF_PAYMENT_CATEGORY_NAME,
} from "@/lib/expenses-module/constants";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_BRANCH_CODE,
  DEFAULT_BRANCH_NAME,
  DEFAULT_EXPENSE_TEMPLATES,
  SALAAMA_BRANCH_CODE,
  SALAAMA_BRANCH_NAME,
} from "@/lib/constants";
import {
  checkDatabaseConnection,
  prisma,
  resetPrismaClientCache,
} from "@/lib/db";
import { getTodayISO } from "@/lib/dates";
import { deployPendingMigrations } from "@/lib/server/migrations/deploy";
import { clearBranchLookupCache } from "@/lib/server/branch-lookup";
import {
  DEFAULT_OWNER_DISPLAY_NAME,
  DEFAULT_OWNER_USERNAME,
  OWNER_STAFF_ROLE_SLUG,
  PRODUCTION_ROLES,
} from "@/lib/server/bootstrap/constants";
import { hashPassword } from "@/lib/server/password";
import { ensureProductCategoriesSeeded } from "@/lib/server/product-category-lookup";
import { clearRoleLookupCache } from "@/lib/server/role-lookup";

export async function runDatabaseConnectionStage(): Promise<void> {
  const connection = await checkDatabaseConnection();

  if (!connection.connected) {
    throw new Error(
      connection.error ?? "Unable to connect to PostgreSQL."
    );
  }
}

export async function runMigrationsVerifiedStage(): Promise<void> {
  try {
    await deployPendingMigrations();
  } catch (error) {
    console.error(
      "[bootstrap] prisma migrate deploy failed, applying schema patches:",
      error instanceof Error ? error.message : error
    );
  }

  await prisma.$executeRaw`
    ALTER TABLE "DayClosing" ADD COLUMN IF NOT EXISTS "openedBy" TEXT;
    ALTER TABLE "DayClosing" ADD COLUMN IF NOT EXISTS "openedByName" TEXT;
    ALTER TABLE "DayClosing" ADD COLUMN IF NOT EXISTS "openedAt" TIMESTAMP(3);
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
  `;

  resetPrismaClientCache();
}

const PRODUCTION_BRANCHES = [
  { code: DEFAULT_BRANCH_CODE, name: DEFAULT_BRANCH_NAME },
  { code: SALAAMA_BRANCH_CODE, name: SALAAMA_BRANCH_NAME },
] as const;

export async function runBranchesStage(): Promise<void> {
  for (const branch of PRODUCTION_BRANCHES) {
    await prisma.branch.upsert({
      where: { code: branch.code },
      update: {
        name: branch.name,
        active: true,
      },
      create: {
        name: branch.name,
        code: branch.code,
        active: true,
      },
    });
  }

  const settings = await prisma.appSetting.findUnique({
    where: { id: "default" },
  });

  if (settings) {
    const branchNames = {
      ...(typeof settings.branchNames === "object" && settings.branchNames !== null
        ? (settings.branchNames as Record<string, string>)
        : {}),
      [DEFAULT_BRANCH_CODE]: DEFAULT_BRANCH_NAME,
      [SALAAMA_BRANCH_CODE]: SALAAMA_BRANCH_NAME,
    };

    await prisma.appSetting.update({
      where: { id: "default" },
      data: { branchNames },
    });
  }

  clearBranchLookupCache();
}

export async function runRolesStage(): Promise<void> {
  for (const role of PRODUCTION_ROLES) {
    await prisma.role.upsert({
      where: { slug: role.id },
      update: {
        name: role.name,
        description: role.description,
        modules: [...role.modules],
        isSystem: true,
      },
      create: {
        slug: role.id,
        name: role.name,
        description: role.description,
        modules: [...role.modules],
        isSystem: true,
      },
    });
  }

  const { LEGACY_ROLE_MIGRATIONS } = await import("@/lib/staff/roles");

  for (const [legacySlug, nextSlug] of Object.entries(LEGACY_ROLE_MIGRATIONS)) {
    const legacyRole = await prisma.role.findUnique({
      where: { slug: legacySlug },
      select: { id: true },
    });
    const nextRole = await prisma.role.findUnique({
      where: { slug: nextSlug },
      select: { id: true },
    });

    if (!legacyRole || !nextRole || legacyRole.id === nextRole.id) {
      continue;
    }

    await prisma.user.updateMany({
      where: { roleId: legacyRole.id },
      data: { roleId: nextRole.id },
    });

    await prisma.staff.updateMany({
      where: { roleId: legacyRole.id },
      data: { roleId: nextRole.id },
    });
  }

  clearRoleLookupCache();
}

async function resolveOwnerBranchId(): Promise<string> {
  const defaultBranch = await prisma.branch.findUnique({
    where: { code: DEFAULT_BRANCH_CODE },
    select: { id: true },
  });

  if (defaultBranch) {
    return defaultBranch.id;
  }

  const firstActiveBranch = await prisma.branch.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!firstActiveBranch) {
    throw new Error("No active branch is available for the owner user.");
  }

  return firstActiveBranch.id;
}

export async function runOwnerUserStage(): Promise<void> {
  const ownerRole = await prisma.role.findUniqueOrThrow({
    where: { slug: "owner" },
  });
  const branchId = await resolveOwnerBranchId();
  const passwordHash = await hashPassword(DEFAULT_OWNER_USERNAME);

  await prisma.user.upsert({
    where: { username: DEFAULT_OWNER_USERNAME },
    update: {
      displayName: DEFAULT_APP_SETTINGS.ownerName,
      passwordHash,
      roleId: ownerRole.id,
      branchId,
      active: true,
    },
    create: {
      username: DEFAULT_OWNER_USERNAME,
      displayName: DEFAULT_APP_SETTINGS.ownerName,
      passwordHash,
      roleId: ownerRole.id,
      branchId,
      active: true,
    },
  });

  const validBranchIds = (
    await prisma.branch.findMany({ select: { id: true } })
  ).map((branch) => branch.id);

  if (validBranchIds.length > 0) {
    await prisma.user.updateMany({
      where: {
        branchId: {
          notIn: validBranchIds,
        },
      },
      data: {
        branchId,
      },
    });
  }
}

export async function runOwnerStaffStage(): Promise<void> {
  const ownerUser = await prisma.user.findFirstOrThrow({
    where: { username: DEFAULT_OWNER_USERNAME, active: true },
    include: {
      role: true,
    },
  });

  if (ownerUser.role.slug !== "owner") {
    throw new Error("Owner user does not have the owner role.");
  }

  const staffRole = await prisma.role.findUniqueOrThrow({
    where: { slug: OWNER_STAFF_ROLE_SLUG },
  });

  const ownerName = DEFAULT_APP_SETTINGS.ownerName;
  const existingStaff =
    (await prisma.staff.findUnique({
      where: { username: DEFAULT_OWNER_USERNAME },
    })) ??
    (await prisma.staff.findFirst({
      where: {
        username: DEFAULT_OWNER_USERNAME,
        deletedAt: { not: null },
      },
    }));

  if (existingStaff) {
    await prisma.staff.update({
      where: { id: existingStaff.id },
      data: {
        name: ownerName,
        username: DEFAULT_OWNER_USERNAME,
        branchId: ownerUser.branchId,
        roleId: staffRole.id,
        loginEnabled: true,
        status: "active",
        active: true,
        deletedAt: null,
      },
    });
    return;
  }

  await prisma.staff.create({
    data: {
      name: ownerName,
      username: DEFAULT_OWNER_USERNAME,
      branchId: ownerUser.branchId,
      roleId: staffRole.id,
      loginEnabled: true,
      status: "active",
      active: true,
      dateJoined: getTodayISO(),
    },
  });
}

export async function runLinkUserStaffIdStage(): Promise<void> {
  const ownerUser = await prisma.user.findFirstOrThrow({
    where: { username: DEFAULT_OWNER_USERNAME, active: true },
    include: {
      role: true,
    },
  });

  const ownerStaff = await prisma.staff.findUniqueOrThrow({
    where: { username: DEFAULT_OWNER_USERNAME },
  });

  if (ownerUser.staffId === ownerStaff.id) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const linkedToAnotherUser = await tx.user.findFirst({
      where: {
        staffId: ownerStaff.id,
        NOT: { id: ownerUser.id },
      },
      select: { id: true },
    });

    if (linkedToAnotherUser) {
      throw new Error("Owner staff record is already linked to another user.");
    }

    await tx.user.update({
      where: { id: ownerUser.id },
      data: { staffId: ownerStaff.id },
    });

    await tx.staff.update({
      where: { id: ownerStaff.id },
      data: {
        loginEnabled: true,
        username: DEFAULT_OWNER_USERNAME,
        branchId: ownerUser.branchId,
      },
    });
  });
}

export async function runExpenseCategoriesStage(): Promise<void> {
  const categoryCount = await prisma.expenseCategory.count();
  if (categoryCount > 0) {
    return;
  }

  const categories = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
      id: category.id,
      name: category.name,
      isDefault: true,
    })),
    {
      id: STAFF_PAYMENT_CATEGORY_ID,
      name: STAFF_PAYMENT_CATEGORY_NAME,
      isDefault: true,
    },
  ];

  await prisma.expenseCategory.createMany({
    data: categories,
    skipDuplicates: true,
  });
}

export async function runExpenseTemplatesStage(): Promise<void> {
  const templateCount = await prisma.expenseTemplate.count();
  if (templateCount >= DEFAULT_EXPENSE_TEMPLATES.length) {
    return;
  }

  for (const template of DEFAULT_EXPENSE_TEMPLATES) {
    await prisma.expenseTemplate.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        category: template.category,
        defaultAmount: template.defaultAmount ?? null,
        active: template.active,
      },
      create: {
        id: template.id,
        name: template.name,
        category: template.category,
        defaultAmount: template.defaultAmount ?? null,
        active: template.active,
      },
    });
  }
}

export async function runSettingsStage(): Promise<void> {
  await ensureProductCategoriesSeeded();

  await prisma.appSetting.upsert({
    where: { id: "default" },
    update: {
      businessName: DEFAULT_APP_SETTINGS.businessName,
      ownerName: DEFAULT_APP_SETTINGS.ownerName,
      branchNames: DEFAULT_APP_SETTINGS.branchNames,
      defaultLunchAmount: DEFAULT_APP_SETTINGS.defaultLunchAmount,
    },
    create: {
      id: "default",
      businessName: DEFAULT_APP_SETTINGS.businessName,
      ownerName: DEFAULT_APP_SETTINGS.ownerName,
      branchNames: DEFAULT_APP_SETTINGS.branchNames,
      defaultLunchAmount: DEFAULT_APP_SETTINGS.defaultLunchAmount,
    },
  });
}

export async function runRbacRepairStage(): Promise<void> {
  await runRolesStage();
  await runOwnerUserStage();
}

export async function runStartupCompleteStage(): Promise<void> {
  return;
}
