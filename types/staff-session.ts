import type { Branch } from "@/types";
import type { StaffRoleId } from "@/types/staff-role";

export interface StaffActionRecord {
  staffId: string;
  staffName: string;
  role: StaffRoleId;
  branch: Branch;
  timestamp: string;
}
