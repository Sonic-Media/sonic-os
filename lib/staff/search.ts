import { getStaffRoleName } from "@/lib/staff/roles";
import type { Staff } from "@/types";

export function filterStaffBySearch(staff: Staff[], query: string): Staff[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return staff;

  return staff.filter((member) => {
    const roleName = getStaffRoleName(member.role).toLowerCase();

    return (
      member.name.toLowerCase().includes(normalized) ||
      member.username?.toLowerCase().includes(normalized) ||
      roleName.includes(normalized) ||
      member.branch.toLowerCase().includes(normalized) ||
      member.phone?.includes(normalized)
    );
  });
}
