import type { AuthSession } from "@/types/auth";
import type { Staff } from "@/types";

const ROLE_GREETING_LABELS = new Set(["Owner", "Branch Manager", "Cashier"]);

export function extractFirstName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed || trimmed === "—") {
    return "there";
  }

  return trimmed.split(/\s+/)[0];
}

export function isRoleGreetingLabel(name: string | null | undefined): boolean {
  if (!name?.trim()) return false;
  return ROLE_GREETING_LABELS.has(name.trim());
}

export function resolveStaffDisplayName(
  session: AuthSession | null | undefined,
  staff: Staff[]
): string {
  if (!session) return "—";

  const linkedStaff = session.staffId
    ? staff.find((member) => member.id === session.staffId)
    : staff.find((member) => member.userId === session.userId);
  const staffName = linkedStaff?.name?.trim();
  const displayName = session.displayName?.trim();

  if (staffName && !isRoleGreetingLabel(staffName)) {
    return staffName;
  }

  if (displayName && !isRoleGreetingLabel(displayName)) {
    return displayName;
  }

  return staffName || displayName || "—";
}

export function resolveStaffFirstName(
  session: AuthSession | null | undefined,
  staff: Staff[]
): string {
  return extractFirstName(resolveStaffDisplayName(session, staff));
}
