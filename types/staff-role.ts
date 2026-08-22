export type StaffRoleId = "branch-manager" | "cashier";

export type StaffStatus = "active" | "inactive";

export type StaffModule =
  | "home"
  | "operations"
  | "sales"
  | "purchasing"
  | "expenses"
  | "stock"
  | "branches"
  | "reports"
  | "history"
  | "staff"
  | "settings";

export interface StaffRoleDefinition {
  id: StaffRoleId;
  name: string;
  description: string;
  modules: StaffModule[];
  isDefault: boolean;
}

export interface StaffInput {
  name: string;
  username?: string;
  branch: string;
  role: StaffRoleId;
  loginEnabled?: boolean;
  status?: StaffStatus;
  phone?: string;
  email?: string;
  dailyWage?: number;
  monthlySalary?: number;
  dateJoined?: string;
  emergencyContact?: string;
  notes?: string;
}

export interface StaffLoginInput {
  username: string;
  password: string;
}
