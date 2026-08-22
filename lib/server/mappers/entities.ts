import { mapStaffActionRecord } from "@/lib/server/json-fields";
import { computeProductStatus } from "@/lib/stock/product-status";
import type { Entry, Expense, Staff } from "@/types";
import type { AppUser, UserRole } from "@/types/auth";
import type {
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseRecord,
} from "@/types/expenses-module";
import type { Purchase, PurchaseLineItem, Supplier } from "@/types/purchasing";
import type {
  Sale,
  SaleLineItem,
  SalePaymentMethod,
  SaleStatus,
  Customer,
} from "@/types/sales";
import type {
  StaffPaymentRecord,
  StaffPaymentType,
} from "@/types/staff-payment";
import type { StaffRoleDefinition, StaffRoleId } from "@/types/staff-role";
import type {
  StockMovement,
  StockMovementType,
  StockPriceChange,
  StockProduct,
  StockProductCategory,
  StockProductStatus,
} from "@/types/stock";
import type { EntryStatus } from "@/types";

type BranchRelation = { code: string };
type RoleRelation = { slug: string };

export type UserWithRelations = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  active: boolean;
  staffId: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: RoleRelation;
  branch: BranchRelation;
};

type StaffWithRelations = {
  id: string;
  name: string;
  username: string | null;
  loginEnabled: boolean;
  status: string;
  active: boolean;
  phone: string | null;
  email: string | null;
  dailyWage: number | null;
  monthlySalary: number | null;
  dateJoined: string;
  emergencyContact: string | null;
  notes: string | null;
  role: RoleRelation;
  branch: BranchRelation;
  user: { id: string } | null;
};

type RoleRecord = {
  slug: string;
  name: string;
  description: string | null;
  modules: string[];
  isSystem: boolean;
};

type CustomerRecord = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SaleLineItemRecord = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  buyingPrice: number;
  lineTotal: number;
};

type SaleWithRelations = {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  customerId: string | null;
  customerName: string | null;
  subtotal: number;
  discount: number;
  total: number;
  profit: number;
  paymentMethod: string;
  staffId: string | null;
  staffName: string | null;
  createdBy: unknown;
  completedBy: unknown;
  notes: string | null;
  status: string;
  createdAt: Date;
  branch: BranchRelation;
  items: SaleLineItemRecord[];
};

type SupplierRecord = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PurchaseLineItemRecord = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  buyingPrice: number;
  lineTotal: number;
};

type PurchaseWithRelations = {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  totalCost: number;
  staffId: string | null;
  staffName: string | null;
  createdBy: unknown;
  notes: string | null;
  createdAt: Date;
  branch: BranchRelation;
  items: PurchaseLineItemRecord[];
};

type ProductRecord = {
  id: string;
  name: string;
  category: { slug: string };
  sku: string | null;
  buyingPrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStockLevel: number;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type MovementRecord = {
  id: string;
  date: string;
  productId: string;
  productName: string;
  movement: string;
  quantity: number;
  reason: string;
  notes: string | null;
  createdBy: unknown;
  createdAt: Date;
  branch: BranchRelation;
};

type PriceChangeRecord = {
  id: string;
  productId: string;
  previousBuyingPrice: number;
  previousSellingPrice: number;
  newBuyingPrice: number;
  newSellingPrice: number;
  createdAt: Date;
};

type ExpenseCategoryRecord = {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ExpenseRecordRow = {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  paymentMethod: string;
  staffId: string | null;
  staffName: string | null;
  staffRole: string | null;
  staffPaymentType: string | null;
  staffPaymentId: string | null;
  createdBy: unknown;
  paidBy: unknown;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  branch: BranchRelation;
};

type StaffPaymentRow = {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  date: string;
  paidBy: unknown;
  notes: string | null;
  expenseId: string;
  createdAt: Date;
  updatedAt: Date;
  branch: BranchRelation;
};

type DailyOperationExpenseRow = {
  id: string;
  name: string;
  amount: number;
};

type DailyOperationRow = {
  id: string;
  date: string;
  time: string;
  timestamp: bigint;
  sales: number;
  staffId: string | null;
  staffName: string;
  createdBy: unknown;
  notes: string;
  savingsAllocation: number | null;
  status: string;
  createdAt: Date;
  branch: BranchRelation;
  expenses: DailyOperationExpenseRow[];
};

export function mapUserToAppUser(user: UserWithRelations): AppUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role.slug as UserRole,
    passwordHash: user.passwordHash,
    branch: user.branch.code,
    active: user.active,
    staffId: user.staffId ?? undefined,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function mapRoleToDefinition(role: RoleRecord): StaffRoleDefinition {
  return {
    id: role.slug as StaffRoleId,
    name: role.name,
    description: role.description ?? "",
    modules: role.modules as StaffRoleDefinition["modules"],
    isDefault: role.isSystem,
  };
}

export function mapStaffToEntity(staff: StaffWithRelations): Staff {
  return {
    id: staff.id,
    name: staff.name,
    username: staff.username ?? undefined,
    branch: staff.branch.code,
    role: staff.role.slug as StaffRoleId,
    loginEnabled: staff.loginEnabled,
    status: staff.status as Staff["status"],
    userId: staff.user?.id,
    active: staff.active,
    phone: staff.phone ?? undefined,
    email: staff.email ?? undefined,
    dailyWage: staff.dailyWage ?? undefined,
    monthlySalary: staff.monthlySalary ?? undefined,
    dateJoined: staff.dateJoined,
    emergencyContact: staff.emergencyContact ?? undefined,
    notes: staff.notes ?? undefined,
  };
}

export function mapCustomerToEntity(customer: CustomerRecord): Customer {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone ?? undefined,
    email: customer.email ?? undefined,
    notes: customer.notes ?? undefined,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

function mapSaleLineItem(item: SaleLineItemRecord): SaleLineItem {
  return {
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    buyingPrice: item.buyingPrice,
    lineTotal: item.lineTotal,
  };
}

export function mapSaleToEntity(sale: SaleWithRelations): Sale {
  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    date: sale.date,
    time: sale.time,
    customerId: sale.customerId ?? undefined,
    customerName: sale.customerName ?? undefined,
    items: sale.items.map(mapSaleLineItem),
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    profit: sale.profit,
    paymentMethod: sale.paymentMethod as SalePaymentMethod,
    branch: sale.branch.code,
    staffId: sale.staffId ?? undefined,
    staffName: sale.staffName ?? undefined,
    createdBy: mapStaffActionRecord(sale.createdBy),
    completedBy: mapStaffActionRecord(sale.completedBy),
    notes: sale.notes ?? undefined,
    status: sale.status as SaleStatus,
    createdAt: sale.createdAt.toISOString(),
  };
}

export function mapSupplierToEntity(supplier: SupplierRecord): Supplier {
  return {
    id: supplier.id,
    name: supplier.name,
    phone: supplier.phone ?? undefined,
    email: supplier.email ?? undefined,
    address: supplier.address ?? undefined,
    notes: supplier.notes ?? undefined,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}

function mapPurchaseLineItem(item: PurchaseLineItemRecord): PurchaseLineItem {
  return {
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    buyingPrice: item.buyingPrice,
    lineTotal: item.lineTotal,
  };
}

export function mapPurchaseToEntity(purchase: PurchaseWithRelations): Purchase {
  return {
    id: purchase.id,
    invoiceNumber: purchase.invoiceNumber,
    date: purchase.date,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName,
    items: purchase.items.map(mapPurchaseLineItem),
    totalCost: purchase.totalCost,
    branch: purchase.branch.code,
    staffId: purchase.staffId ?? undefined,
    staffName: purchase.staffName ?? undefined,
    createdBy: mapStaffActionRecord(purchase.createdBy),
    notes: purchase.notes ?? undefined,
    createdAt: purchase.createdAt.toISOString(),
  };
}

export function mapProductToEntity(product: ProductRecord): StockProduct {
  return {
    id: product.id,
    name: product.name,
    category: product.category.slug as StockProductCategory,
    sku: product.sku ?? undefined,
    buyingPrice: product.buyingPrice,
    sellingPrice: product.sellingPrice,
    currentStock: product.currentStock,
    minimumStockLevel: product.minimumStockLevel,
    notes: product.notes ?? undefined,
    status: computeProductStatus(
      product.currentStock,
      product.minimumStockLevel
    ),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function mapMovementToEntity(movement: MovementRecord): StockMovement {
  return {
    id: movement.id,
    date: movement.date,
    productId: movement.productId,
    productName: movement.productName,
    movement: movement.movement as StockMovementType,
    quantity: movement.quantity,
    reason: movement.reason,
    branch: movement.branch.code,
    notes: movement.notes ?? undefined,
    createdBy: mapStaffActionRecord(movement.createdBy),
    createdAt: movement.createdAt.toISOString(),
  };
}

export function mapPriceChangeToEntity(
  change: PriceChangeRecord
): StockPriceChange {
  return {
    id: change.id,
    productId: change.productId,
    previousBuyingPrice: change.previousBuyingPrice,
    previousSellingPrice: change.previousSellingPrice,
    newBuyingPrice: change.newBuyingPrice,
    newSellingPrice: change.newSellingPrice,
    createdAt: change.createdAt.toISOString(),
  };
}

export function mapExpenseCategoryToEntity(
  category: ExpenseCategoryRecord
): ExpenseCategory {
  return {
    id: category.id,
    name: category.name,
    isDefault: category.isDefault,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function mapExpenseRecordToEntity(
  record: ExpenseRecordRow
): ExpenseRecord {
  return {
    id: record.id,
    date: record.date,
    categoryId: record.categoryId,
    categoryName: record.categoryName,
    description: record.description,
    amount: record.amount,
    paymentMethod: record.paymentMethod as ExpensePaymentMethod,
    branch: record.branch.code,
    staffId: record.staffId ?? undefined,
    staffName: record.staffName ?? undefined,
    staffRole: (record.staffRole as StaffRoleId | null) ?? undefined,
    staffPaymentType:
      (record.staffPaymentType as StaffPaymentType | null) ?? undefined,
    staffPaymentId: record.staffPaymentId ?? undefined,
    createdBy: mapStaffActionRecord(record.createdBy),
    paidBy: mapStaffActionRecord(record.paidBy),
    notes: record.notes ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapStaffPaymentToEntity(
  payment: StaffPaymentRow
): StaffPaymentRecord {
  return {
    id: payment.id,
    staffId: payment.staffId,
    staffName: payment.staffName,
    staffRole: payment.staffRole as StaffRoleId,
    amount: payment.amount,
    paymentType: payment.paymentType as StaffPaymentType,
    paymentMethod: payment.paymentMethod as ExpensePaymentMethod,
    branch: payment.branch.code,
    date: payment.date,
    paidBy: mapStaffActionRecord(payment.paidBy),
    notes: payment.notes ?? undefined,
    expenseId: payment.expenseId,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export function mapDailyOperationToEntry(operation: DailyOperationRow): Entry {
  const expenses: Expense[] = operation.expenses.map((expense) => ({
    id: expense.id,
    name: expense.name,
    amount: expense.amount,
  }));

  return {
    id: operation.id,
    date: operation.date,
    time: operation.time,
    timestamp: Number(operation.timestamp),
    branch: operation.branch.code,
    sales: operation.sales,
    expenses,
    staffId: operation.staffId ?? undefined,
    staffName: operation.staffName || undefined,
    createdBy: mapStaffActionRecord(operation.createdBy),
    notes: operation.notes,
    savingsAllocation: operation.savingsAllocation ?? undefined,
    createdAt: operation.createdAt.toISOString(),
    status: operation.status as EntryStatus,
  };
}
