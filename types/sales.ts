import type { Branch } from "@/types";
import type { StaffActionRecord } from "@/types/staff-session";

export type SalePaymentMethod =
  | "cash"
  | "mobile-money"
  | "card"
  | "bank-transfer"
  | "other";

export type SaleStatus = "completed" | "voided";

export interface SaleLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  buyingPrice: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  customerId?: string;
  customerName?: string;
  items: SaleLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  profit: number;
  paymentMethod: SalePaymentMethod;
  branch: Branch;
  staffId?: string;
  staffName?: string;
  createdBy?: StaffActionRecord;
  completedBy?: StaffActionRecord;
  notes?: string;
  status: SaleStatus;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWithStats extends Customer {
  purchaseCount: number;
  lifetimeSpend: number;
  lastPurchaseDate: string | null;
}

export interface SalesDashboardMetrics {
  todayRevenue: number | null;
  todayProfit: number | null;
  itemsSoldToday: number | null;
  transactionsToday: number | null;
  averageSaleValue: number | null;
  topSellingItem: string | null;
}

export interface SaleInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  customerId?: string;
  paymentMethod: SalePaymentMethod;
  branch: Branch;
  notes?: string;
}

export interface CustomerInput {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export type CustomerUpdateInput = CustomerInput;

export type SaleDateFilter = "all" | "today" | "week" | "month";

export type SalePaymentFilter = SalePaymentMethod | "all";

export type SaleCustomerFilter = string | "all";

export interface SaleFilterCriteria {
  search: string;
  date: SaleDateFilter;
  customer: SaleCustomerFilter;
  paymentMethod: SalePaymentFilter;
}

export interface SaleValidationResult {
  success: boolean;
  errors: Record<string, string | undefined>;
}

export interface SaleCalculationPreview {
  subtotal: number;
  discount: number;
  total: number;
  profit: number;
}
