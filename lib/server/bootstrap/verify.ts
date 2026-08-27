import {
  DEFAULT_EXPENSE_CATEGORIES,
  STAFF_PAYMENT_CATEGORY_ID,
} from "@/lib/expenses-module/constants";
import { DEFAULT_EXPENSE_TEMPLATES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  DEFAULT_OWNER_USERNAME,
  getRequiredRoleSlugs,
} from "@/lib/server/bootstrap/constants";
import type { BootstrapStage } from "@/lib/server/bootstrap/types";

const EXPECTED_EXPENSE_CATEGORY_COUNT =
  DEFAULT_EXPENSE_CATEGORIES.length + 1;

export async function verifyDatabaseConnectionStage(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1::int AS ok`;
  return Number(rows[0]?.ok ?? 0) === 1;
}

export async function verifyMigrationsVerifiedStage(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "_prisma_migrations"
    WHERE "finished_at" IS NOT NULL
  `;

  if (Number(rows[0]?.count ?? 0) > 0) {
    return true;
  }

  const schemaRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('Role', 'User', 'Branch')
  `;

  return Number(schemaRows[0]?.count ?? 0) === 3;
}

export async function verifyBranchesStage(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "Branch"
    WHERE active = true
  `;

  return Number(rows[0]?.count ?? 0) >= 1;
}

export async function verifyRolesStage(): Promise<boolean> {
  const requiredSlugs = getRequiredRoleSlugs();

  const roleCount = await prisma.role.count({
    where: {
      slug: {
        in: requiredSlugs,
      },
    },
  });

  return roleCount === requiredSlugs.length;
}

export async function verifyOwnerUserStage(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "User" u
    INNER JOIN "Role" r ON r.id = u."roleId"
    WHERE r.slug = 'owner'
      AND u.username = ${DEFAULT_OWNER_USERNAME}
      AND u.active = true
  `;

  return Number(rows[0]?.count ?? 0) === 1;
}

export async function verifyOwnerStaffStage(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "Staff" s
    INNER JOIN "User" u ON u.username = ${DEFAULT_OWNER_USERNAME}
    INNER JOIN "Role" owner_role ON owner_role.id = u."roleId" AND owner_role.slug = 'owner'
    WHERE s.username = ${DEFAULT_OWNER_USERNAME}
      AND s."branchId" = u."branchId"
      AND s.active = true
  `;

  return Number(rows[0]?.count ?? 0) >= 1;
}

export async function verifyLinkUserStaffIdStage(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "User" u
    INNER JOIN "Role" r ON r.id = u."roleId"
    INNER JOIN "Staff" s ON s.id = u."staffId"
    WHERE r.slug = 'owner'
      AND u.username = ${DEFAULT_OWNER_USERNAME}
      AND u."staffId" IS NOT NULL
      AND s.username = ${DEFAULT_OWNER_USERNAME}
  `;

  return Number(rows[0]?.count ?? 0) >= 1;
}

export async function verifyExpenseCategoriesStage(): Promise<boolean> {
  const countRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "ExpenseCategory"
  `;

  if (Number(countRows[0]?.count ?? 0) < EXPECTED_EXPENSE_CATEGORY_COUNT) {
    return false;
  }

  const categoryIds = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((category) => category.id),
    STAFF_PAYMENT_CATEGORY_ID,
  ];

  const existingCount = await prisma.expenseCategory.count({
    where: {
      id: {
        in: categoryIds,
      },
    },
  });

  return existingCount === categoryIds.length;
}

export async function verifyExpenseTemplatesStage(): Promise<boolean> {
  const count = await prisma.expenseTemplate.count({
    where: {
      id: {
        in: DEFAULT_EXPENSE_TEMPLATES.map((template) => template.id),
      },
    },
  });

  return count === DEFAULT_EXPENSE_TEMPLATES.length;
}

export async function verifySettingsStage(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "AppSetting"
    WHERE id = 'default'
  `;

  return Number(rows[0]?.count ?? 0) === 1;
}

const STAGE_VERIFIERS: Record<
  Exclude<BootstrapStage, "startup_complete">,
  () => Promise<boolean>
> = {
  database_connection: verifyDatabaseConnectionStage,
  migrations_verified: verifyMigrationsVerifiedStage,
  branches: verifyBranchesStage,
  roles: verifyRolesStage,
  owner_user: verifyOwnerUserStage,
  owner_staff: verifyOwnerStaffStage,
  link_user_staff_id: verifyLinkUserStaffIdStage,
  expense_categories: verifyExpenseCategoriesStage,
  expense_templates: verifyExpenseTemplatesStage,
  settings: verifySettingsStage,
};

export async function verifyBootstrapStage(
  stage: Exclude<BootstrapStage, "startup_complete">
): Promise<boolean> {
  return STAGE_VERIFIERS[stage]();
}

export async function verifyStartupCompleteStage(): Promise<boolean> {
  for (const stage of Object.keys(STAGE_VERIFIERS) as Array<
    Exclude<BootstrapStage, "startup_complete">
  >) {
    const verified = await verifyBootstrapStage(stage);
    if (!verified) {
      return false;
    }
  }

  return true;
}

export async function findIncompleteBootstrapStage(): Promise<BootstrapStage | null> {
  for (const stage of Object.keys(STAGE_VERIFIERS) as Array<
    Exclude<BootstrapStage, "startup_complete">
  >) {
    const verified = await verifyBootstrapStage(stage);
    if (!verified) {
      return stage;
    }
  }

  const startupComplete = await verifyStartupCompleteStage();
  return startupComplete ? null : "startup_complete";
}
