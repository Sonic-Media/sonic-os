import type { Branch } from "@/types";

export interface PurchaseLineItem {
  productId: string;
  productName: string;
  quantity: number;
  buyingPrice: number;
  lineTotal: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseLineItem[];
  totalCost: number;
  branch: Branch;
  staffId?: string;
  staffName?: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierWithStats extends Supplier {
  totalPurchases: number;
  totalAmountPurchased: number;
  lastPurchaseDate: string | null;
}

export interface PurchasingDashboardMetrics {
  todaysPurchases: number | null;
  monthlyPurchases: number | null;
  totalPurchaseValue: number | null;
  topSupplier: string | null;
}

export interface PurchaseLineItemInput {
  productId: string;
  quantity: number;
  buyingPrice: number;
}

export interface PurchaseInput {
  supplierId: string;
  items: PurchaseLineItemInput[];
  branch: Branch;
  staffId?: string;
  notes?: string;
  date?: string;
}

export interface SupplierInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export type SupplierUpdateInput = SupplierInput;

export type PurchaseDateFilter = "all" | "today" | "week" | "month";

export type PurchaseSupplierFilter = string | "all";

export interface PurchaseFilterCriteria {
  search: string;
  date: PurchaseDateFilter;
  supplier: PurchaseSupplierFilter;
}

export interface PurchaseValidationResult {
  success: boolean;
  errors: Record<string, string | undefined>;
}

export interface PurchaseDraftLineItem {
  id: string;
  productId: string;
  quantity: string;
  buyingPrice: string;
}

export interface PurchaseTotalsPreview {
  lineSubtotals: number[];
  grandTotal: number;
}
