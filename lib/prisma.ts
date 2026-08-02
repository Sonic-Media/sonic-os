/**
 * Stable Prisma import surface for Sonic OS.
 * The generated client lives in ./generated/prisma (see prisma/schema.prisma).
 * Run `npm run db:generate` or `npm install` to regenerate it.
 */
export { PrismaClient, Prisma } from "./generated/prisma/client";
export type {
  AuthAuditLog,
  Branch,
  Customer,
  DailyOperation,
  DailyOperationExpense,
  ExpenseCategory,
  ExpenseRecord,
  Product,
  Purchase,
  PurchaseLineItem,
  Role,
  Sale,
  SaleLineItem,
  Session,
  Staff,
  StockMovement,
  StockPriceChange,
  Supplier,
  User,
  UserPreference,
} from "./generated/prisma/client";
