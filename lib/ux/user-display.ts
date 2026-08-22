import type { AuthSession } from "@/types/auth";
import type { Staff } from "@/types";

export function resolveStaffDisplayName(
  session: AuthSession | null | undefined,
  staff: Staff[]
): string {
  if (!session) return "—";

  const linkedStaff = staff.find((member) => member.userId === session.userId);
  return linkedStaff?.name ?? session.displayName;
}
