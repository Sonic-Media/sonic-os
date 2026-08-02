export type StaffRoleId =
  | "ceo"
  | "manager"
  | "cashier"
  | "salesperson"
  | "technician"
  | "store-attendant"
  | "accountant";

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
  branch: string;
  role: StaffRoleId;
  loginEnabled?: boolean;
  status?: StaffStatus;
}

export interface StaffLoginInput {
  username: string;
  password: string;
}
