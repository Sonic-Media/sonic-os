import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { getBranchIdByCode } from "@/lib/server/branch-lookup";
import {
  mapUserToAppUser,
  type UserWithRelations,
} from "@/lib/server/mappers/entities";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { getRoleIdBySlug } from "@/lib/server/role-lookup";
import { getSessionFromRequest } from "@/lib/server/session";
import { recordSecurityAuditInTransaction } from "@/lib/server/security/audit";
import {
  createUserSchema,
  updateUserSchema,
} from "@/lib/validation/auth";
import type { AppUser } from "@/types/auth";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const userInclude = {
  role: true,
  branch: true,
  staff: {
    select: {
      loginEnabled: true,
      deletedAt: true,
      active: true,
    },
  },
} as const;

const USERNAME_PATTERN = /^[a-z0-9._-]+$/;

function sortUsers(users: AppUser[]): AppUser[] {
  const order: AppUser["role"][] = ["owner", "branch-manager", "cashier"];

  return [...users].sort((left, right) => {
    const leftIndex = order.indexOf(left.role);
    const rightIndex = order.indexOf(right.role);
    const roleCompare =
      (leftIndex === -1 ? order.length : leftIndex) -
      (rightIndex === -1 ? order.length : rightIndex);

    if (roleCompare !== 0) {
      return roleCompare;
    }

    return left.displayName.localeCompare(right.displayName);
  });
}

async function findUserWithRelations(
  id: string
): Promise<UserWithRelations | null> {
  return prisma.user.findUnique({
    where: { id },
    include: userInclude,
  });
}

async function requireUserWithRelations(id: string): Promise<UserWithRelations> {
  const user = await findUserWithRelations(id);
  if (!user) {
    throw new ApiError("User not found.", { status: 404, code: "not_found" });
  }

  return user;
}

const USER_IN_USE_MESSAGE =
  "This user has linked business records and cannot be deleted. Disable the account instead.";

async function assertUserDeletable(user: UserWithRelations): Promise<void> {
  const checks: Promise<number>[] = [
    prisma.dayClosing.count({
      where: {
        OR: [{ closedBy: user.id }, { reopenedBy: user.id }],
      },
    }),
  ];

  if (user.staffId) {
    const staffId = user.staffId;
    checks.push(
      prisma.sale.count({ where: { staffId } }),
      prisma.purchase.count({ where: { staffId } }),
      prisma.expenseRecord.count({ where: { staffId } }),
      prisma.dailyOperation.count({ where: { staffId } }),
      prisma.staffPayment.count({ where: { staffId } }),
      prisma.stockMovement.count({
        where: {
          createdBy: {
            path: ["staffId"],
            equals: staffId,
          },
        },
      })
    );
  }

  const counts = await Promise.all(checks);
  if (counts.some((count) => count > 0)) {
    throw new ApiError(USER_IN_USE_MESSAGE, {
      status: 400,
      code: "user_in_use",
    });
  }
}

export async function listUsers(): Promise<AppUser[]> {
  const users = await prisma.user.findMany({
    include: userInclude,
    orderBy: { displayName: "asc" },
  });

  return sortUsers(users.map(mapUserToAppUser));
}

export async function getUserById(id: string): Promise<AppUser | null> {
  const user = await findUserWithRelations(id);
  return user ? mapUserToAppUser(user) : null;
}

export async function createUser(input: unknown): Promise<AppUser> {
  const parsed = createUserSchema.parse(input);
  const username = parsed.username.trim().toLowerCase();

  if (!USERNAME_PATTERN.test(username)) {
    throw new ApiError(
      "Use lowercase letters, numbers, dots, dashes, or underscores.",
      { status: 400, code: "invalid_username" }
    );
  }

  if (parsed.role === "owner") {
    throw new ApiError("Owner accounts cannot be created here.", {
      status: 400,
      code: "invalid_role",
    });
  }

  const staffId = parsed.staffId?.trim();
  if (!staffId) {
    throw new ApiError("Every login must be linked to a staff profile.", {
      status: 400,
      code: "staff_required",
    });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new ApiError("Username already exists.", {
      status: 409,
      code: "duplicate_username",
    });
  }

  const linkedStaff = await prisma.user.findFirst({
    where: { staffId },
  });
  if (linkedStaff) {
    throw new ApiError("This staff member already has a login account.", {
      status: 409,
      code: "duplicate_staff_link",
    });
  }

  const [roleId, branchId, passwordHash] = await Promise.all([
    getRoleIdBySlug(parsed.role),
    getBranchIdByCode(parsed.branch),
    hashPassword(parsed.password),
  ]);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        username,
        displayName: parsed.displayName.trim(),
        passwordHash,
        roleId,
        branchId,
        staffId,
        active: true,
      },
      include: userInclude,
    });

    await tx.staff.update({
      where: { id: staffId },
      data: {
        loginEnabled: true,
        username,
      },
    });

    return created;
  });

  return mapUserToAppUser(user);
}

export async function updateUser(
  id: string,
  input: unknown
): Promise<AppUser> {
  const parsed = updateUserSchema.parse(input);
  const existing = await requireUserWithRelations(id);
  const existingRole = existing.role.slug;

  if (existingRole === "owner" && parsed.role !== "owner") {
    throw new ApiError("The owner role cannot be changed.", {
      status: 400,
      code: "invalid_role",
    });
  }

  if (parsed.role === "owner" && existingRole !== "owner") {
    throw new ApiError("Owner accounts cannot be assigned here.", {
      status: 400,
      code: "invalid_role",
    });
  }

  const [roleId, branchId] = await Promise.all([
    getRoleIdBySlug(parsed.role),
    getBranchIdByCode(parsed.branch),
  ]);

  const user = await prisma.user.update({
    where: { id },
    data: {
      displayName: parsed.displayName.trim(),
      roleId,
      branchId,
    },
    include: userInclude,
  });

  return mapUserToAppUser(user);
}

export async function resetUserPassword(
  id: string,
  password: unknown
): Promise<AppUser> {
  const parsed = resetPasswordSchema.parse({ password });
  const existing = await requireUserWithRelations(id);

  const passwordHash = await hashPassword(parsed.password);

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { passwordHash },
      include: userInclude,
    });

    const verified = await verifyPassword(parsed.password, updated.passwordHash);
    if (!verified) {
      throw new ApiError("Password reset failed verification.", {
        status: 500,
        code: "password_verify_failed",
      });
    }

    if (existing.staffId) {
      await tx.staff.update({
        where: { id: existing.staffId },
        data: { loginEnabled: true },
      });
    }

    return updated.staffId
      ? {
          ...updated,
          staff: {
            loginEnabled: true,
            deletedAt: updated.staff?.deletedAt ?? null,
            active: updated.staff?.active ?? true,
          },
        }
      : updated;
  });

  return mapUserToAppUser(user);
}

export async function disableUser(id: string): Promise<AppUser> {
  const existing = await requireUserWithRelations(id);

  if (existing.role.slug === "owner") {
    throw new ApiError("The owner account cannot be disabled.", {
      status: 400,
      code: "owner_protected",
    });
  }

  const session = await getSessionFromRequest();

  const user = await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId: id } });

    const updated = await tx.user.update({
      where: { id },
      data: { active: false },
      include: userInclude,
    });

    if (existing.staffId) {
      await tx.staff.update({
        where: { id: existing.staffId },
        data: { loginEnabled: false },
      });
    }

    if (session) {
      await recordSecurityAuditInTransaction(
        tx,
        session,
        "disable-user",
        `Disabled user ${updated.username}.`
      );
    }

    return updated.staffId
      ? {
          ...updated,
          staff: {
            loginEnabled: false,
            deletedAt: updated.staff?.deletedAt ?? null,
            active: updated.staff?.active ?? true,
          },
        }
      : updated;
  });

  return mapUserToAppUser(user);
}

export async function enableUser(id: string): Promise<AppUser> {
  const existing = await requireUserWithRelations(id);

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { active: true },
      include: userInclude,
    });

    if (existing.staffId) {
      await tx.staff.update({
        where: { id: existing.staffId },
        data: { loginEnabled: true },
      });
    }

    return updated.staffId
      ? {
          ...updated,
          staff: {
            loginEnabled: true,
            deletedAt: updated.staff?.deletedAt ?? null,
            active: updated.staff?.active ?? true,
          },
        }
      : updated;
  });

  return mapUserToAppUser(user);
}

export async function deleteUser(id: string): Promise<void> {
  const existing = await requireUserWithRelations(id);

  if (existing.role.slug === "owner") {
    throw new ApiError("The owner account cannot be deleted.", {
      status: 400,
      code: "owner_protected",
    });
  }

  const session = await getSessionFromRequest();
  if (session?.userId === id) {
    throw new ApiError("You cannot delete your own account while signed in.", {
      status: 400,
      code: "self_delete_blocked",
    });
  }

  await assertUserDeletable(existing);

  await prisma.$transaction(async (tx) => {
    if (session) {
      await recordSecurityAuditInTransaction(
        tx,
        session,
        "delete-user",
        `Deleted user ${existing.username}.`
      );
    }

    if (existing.staffId) {
      await tx.staff.update({
        where: { id: existing.staffId },
        data: {
          loginEnabled: false,
          username: null,
        },
      });
    }

    await tx.user.delete({ where: { id } });
  });
}
