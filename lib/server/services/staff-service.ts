import { ApiError } from "@/lib/api/errors";
import { BRANCH_IDS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getTodayISO } from "@/lib/dates";
import { isStaffRoleId } from "@/lib/staff/roles";
import { getBranchIdByCode } from "@/lib/server/branch-lookup";
import { mapStaffToEntity } from "@/lib/server/mappers/entities";
import { getRoleIdBySlug } from "@/lib/server/role-lookup";
import { requireSession } from "@/lib/server/session";
import { recordDeleteAudit } from "@/lib/server/data-protection/audit";
import { assertDestructiveApiAllowed } from "@/lib/server/data-protection/guards";
import { migrateLegacyAuthRole } from "@/lib/staff/roles";
import type { Branch, Staff } from "@/types";
import type { StaffInput, StaffRoleId, StaffStatus } from "@/types/staff-role";

const staffInclude = {
  branch: true,
  role: true,
  user: { select: { id: true } },
} as const;

export type StaffUpdatePatch = Partial<
  Pick<
    Staff,
    | "name"
    | "username"
    | "branch"
    | "role"
    | "loginEnabled"
    | "status"
    | "active"
    | "phone"
    | "email"
    | "dailyWage"
    | "monthlySalary"
    | "dateJoined"
    | "emergencyContact"
    | "notes"
  >
>;

function sortStaff(staff: Staff[]): Staff[] {
  return [...staff].sort((left, right) => {
    const branchCompare =
      BRANCH_IDS.indexOf(left.branch) - BRANCH_IDS.indexOf(right.branch);
    if (branchCompare !== 0) return branchCompare;
    return left.name.localeCompare(right.name);
  });
}

function normalizeStaffStatus(
  status: StaffStatus | undefined,
  active: boolean | undefined,
  fallbackActive: boolean
): { status: StaffStatus; active: boolean } {
  if (status) {
    return { status, active: status === "active" };
  }

  if (typeof active === "boolean") {
    return { status: active ? "active" : "inactive", active };
  }

  return {
    status: fallbackActive ? "active" : "inactive",
    active: fallbackActive,
  };
}

async function getStaffRecord(id: string) {
  const staff = await prisma.staff.findUnique({
    where: { id },
    include: staffInclude,
  });

  if (!staff) {
    throw new ApiError("Staff member not found.", {
      status: 404,
      code: "not_found",
    });
  }

  return staff;
}

const STAFF_IN_USE_MESSAGE =
  "This staff member has linked business records and cannot be deleted. Deactivate the staff member instead.";

async function assertStaffNotReferenced(id: string): Promise<void> {
  const [sales, purchases, expenses, entries, staffPayments, stockMovements] =
    await Promise.all([
      prisma.sale.count({ where: { staffId: id } }),
      prisma.purchase.count({ where: { staffId: id } }),
      prisma.expenseRecord.count({ where: { staffId: id } }),
      prisma.dailyOperation.count({ where: { staffId: id } }),
      prisma.staffPayment.count({ where: { staffId: id } }),
      prisma.stockMovement.count({
        where: {
          createdBy: {
            path: ["staffId"],
            equals: id,
          },
        },
      }),
    ]);

  if (
    sales + purchases + expenses + entries + staffPayments + stockMovements >
    0
  ) {
    throw new ApiError(STAFF_IN_USE_MESSAGE, {
      status: 400,
      code: "staff_in_use",
    });
  }
}

export async function listStaff(): Promise<Staff[]> {
  const staff = await prisma.staff.findMany({
    include: staffInclude,
  });

  return sortStaff(staff.map(mapStaffToEntity));
}

export async function listStaffForSession(): Promise<Staff[]> {
  const session = await requireSession();

  if (session.role === "owner") {
    return listStaff();
  }

  const staffRole = migrateLegacyAuthRole(session.role);
  if (staffRole === "branch-manager") {
    return listStaff();
  }

  const linked = await getLinkedStaffForUser(session.userId);
  return linked ? [linked] : [];
}

export async function getLinkedStaffForUser(userId: string): Promise<Staff | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      staff: {
        include: staffInclude,
      },
    },
  });

  if (!user?.staff) {
    return null;
  }

  return mapStaffToEntity(user.staff);
}

export async function createStaff(input: StaffInput): Promise<Staff> {
  const name = input.name.trim();
  if (!name) {
    throw new ApiError("Name is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  if (!input.branch?.trim()) {
    throw new ApiError("Branch is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  if (!input.role || !isStaffRoleId(input.role)) {
    throw new ApiError("Role is required.", {
      status: 400,
      code: "validation_error",
    });
  }

  const branchId = await getBranchIdByCode(input.branch);
  const roleId = await getRoleIdBySlug(input.role);
  const { status, active } = normalizeStaffStatus(input.status, undefined, true);

  const staff = await prisma.staff.create({
    data: {
      name,
      username: input.username?.trim() || null,
      branchId,
      roleId,
      loginEnabled: input.loginEnabled === true,
      status,
      active,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      dailyWage:
        typeof input.dailyWage === "number" && input.dailyWage >= 0
          ? input.dailyWage
          : null,
      monthlySalary:
        typeof input.monthlySalary === "number" && input.monthlySalary >= 0
          ? input.monthlySalary
          : null,
      dateJoined: input.dateJoined?.trim() || getTodayISO(),
      emergencyContact: input.emergencyContact?.trim() || null,
      notes: input.notes?.trim() || null,
    },
    include: staffInclude,
  });

  return mapStaffToEntity(staff);
}

export async function updateStaff(
  id: string,
  patch: StaffUpdatePatch
): Promise<Staff> {
  const existing = await getStaffRecord(id);
  const data: {
    name?: string;
    username?: string | null;
    branchId?: string;
    roleId?: string;
    loginEnabled?: boolean;
    status?: StaffStatus;
    active?: boolean;
    phone?: string | null;
    email?: string | null;
    dailyWage?: number | null;
    monthlySalary?: number | null;
    dateJoined?: string;
    emergencyContact?: string | null;
    notes?: string | null;
  } = {};

  if (typeof patch.name === "string") {
    const name = patch.name.trim();
    if (!name) {
      throw new ApiError("Name is required.", {
        status: 400,
        code: "validation_error",
      });
    }
    data.name = name;
  }

  if (typeof patch.username === "string") {
    data.username = patch.username.trim() || null;
  }

  if (patch.branch) {
    data.branchId = await getBranchIdByCode(patch.branch);
  }

  if (patch.role) {
    if (!isStaffRoleId(patch.role)) {
      throw new ApiError("Invalid role.", {
        status: 400,
        code: "validation_error",
      });
    }
    data.roleId = await getRoleIdBySlug(patch.role);
  }

  if (typeof patch.loginEnabled === "boolean") {
    data.loginEnabled = patch.loginEnabled;
  }

  if (patch.status || typeof patch.active === "boolean") {
    const normalized = normalizeStaffStatus(
      patch.status,
      patch.active,
      existing.active
    );
    data.status = normalized.status;
    data.active = normalized.active;
  }

  if (typeof patch.phone === "string") {
    data.phone = patch.phone.trim() || null;
  }

  if (typeof patch.email === "string") {
    data.email = patch.email.trim() || null;
  }

  if (patch.dailyWage !== undefined) {
    data.dailyWage =
      typeof patch.dailyWage === "number" && patch.dailyWage >= 0
        ? patch.dailyWage
        : null;
  }

  if (patch.monthlySalary !== undefined) {
    data.monthlySalary =
      typeof patch.monthlySalary === "number" && patch.monthlySalary >= 0
        ? patch.monthlySalary
        : null;
  }

  if (typeof patch.dateJoined === "string") {
    data.dateJoined = patch.dateJoined.trim() || existing.dateJoined;
  }

  if (typeof patch.emergencyContact === "string") {
    data.emergencyContact = patch.emergencyContact.trim() || null;
  }

  if (typeof patch.notes === "string") {
    data.notes = patch.notes.trim() || null;
  }

  const staff = await prisma.staff.update({
    where: { id },
    data,
    include: staffInclude,
  });

  return mapStaffToEntity(staff);
}

export async function deactivateStaff(id: string): Promise<Staff> {
  return updateStaff(id, { status: "inactive", active: false });
}

export async function deleteStaff(id: string): Promise<void> {
  assertDestructiveApiAllowed("Staff deletion");

  const session = await requireSession();
  const existing = await getStaffRecord(id);
  await assertStaffNotReferenced(id);

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { staffId: id },
      data: { active: false },
    });
    await tx.staff.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
        status: "inactive",
      },
    });
  });

  await recordDeleteAudit(
    session,
    "staff",
    id,
    existing as unknown as Record<string, unknown>
  );
}

export async function linkStaffUser(
  staffId: string,
  userId: string,
  username?: string
): Promise<Staff> {
  await getStaffRecord(staffId);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError("User not found.", { status: 404, code: "not_found" });
  }

  if (user.staffId && user.staffId !== staffId) {
    throw new ApiError("User is already linked to another staff member.", {
      status: 409,
      code: "user_already_linked",
    });
  }

  const existingLink = await prisma.user.findFirst({
    where: {
      staffId,
      NOT: { id: userId },
    },
  });

  if (existingLink) {
    throw new ApiError("Staff member is already linked to another user.", {
      status: 409,
      code: "staff_already_linked",
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { staffId },
    });

    await tx.staff.update({
      where: { id: staffId },
      data: {
        loginEnabled: true,
        username: username?.trim() || undefined,
      },
    });
  });

  const staff = await getStaffRecord(staffId);
  return mapStaffToEntity(staff);
}

export async function unlinkStaffUser(staffId: string): Promise<Staff> {
  await getStaffRecord(staffId);

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { staffId },
      data: { staffId: null },
    });

    await tx.staff.update({
      where: { id: staffId },
      data: {
        loginEnabled: false,
        username: null,
      },
    });
  });

  const staff = await getStaffRecord(staffId);
  return mapStaffToEntity(staff);
}

export function sortStaffEntities(staff: Staff[]): Staff[] {
  return sortStaff(staff);
}
