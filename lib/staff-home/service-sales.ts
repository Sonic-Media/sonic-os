import { formatEntryTime } from "@/lib/dates";
import {
  SERVICE_SALE_CATEGORIES,
  type ServiceSaleCategory,
} from "@/lib/staff-home/services";

export const SERVICE_SALES_MARKER_START = "<!--SONIC_SERVICE_SALES";
export const SERVICE_SALES_MARKER_END = "-->";

export interface ServiceSaleRecord {
  id: string;
  category: ServiceSaleCategory;
  amount: number;
  description?: string;
  time: string;
  createdAt: string;
  staffId?: string;
  staffName?: string;
}

function isServiceSaleCategory(value: unknown): value is ServiceSaleCategory {
  return (
    typeof value === "string" &&
    (SERVICE_SALE_CATEGORIES as readonly string[]).includes(value)
  );
}

function isServiceSaleRecord(value: unknown): value is ServiceSaleRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    isServiceSaleCategory(record.category) &&
    typeof record.amount === "number" &&
    Number.isFinite(record.amount) &&
    record.amount >= 0 &&
    typeof record.time === "string" &&
    typeof record.createdAt === "string"
  );
}

export function parseServiceSalesFromNotes(notes?: string | null): {
  freeText: string;
  sales: ServiceSaleRecord[];
} {
  const raw = notes ?? "";
  const start = raw.indexOf(SERVICE_SALES_MARKER_START);
  if (start === -1) {
    return { freeText: raw, sales: [] };
  }

  const end = raw.indexOf(SERVICE_SALES_MARKER_END, start);
  if (end === -1) {
    return { freeText: raw, sales: [] };
  }

  const jsonBlock = raw
    .slice(start + SERVICE_SALES_MARKER_START.length, end)
    .trim();
  const freeText = `${raw.slice(0, start).trimEnd()}\n${raw
    .slice(end + SERVICE_SALES_MARKER_END.length)
    .trimStart()}`.trim();

  try {
    const parsed = JSON.parse(jsonBlock) as unknown;
    if (!Array.isArray(parsed)) {
      return { freeText, sales: [] };
    }
    return {
      freeText,
      sales: parsed.filter(isServiceSaleRecord),
    };
  } catch {
    return { freeText, sales: [] };
  }
}

export function encodeNotesWithServiceSales(
  freeText: string,
  sales: ServiceSaleRecord[]
): string {
  const trimmed = freeText.trim();
  if (sales.length === 0) {
    return trimmed;
  }

  const block = `${SERVICE_SALES_MARKER_START}\n${JSON.stringify(sales)}\n${SERVICE_SALES_MARKER_END}`;
  return trimmed ? `${trimmed}\n\n${block}` : block;
}

export function sumServiceSales(sales: ServiceSaleRecord[]): number {
  return sales.reduce((sum, sale) => sum + sale.amount, 0);
}

export function sumServiceSalesByCategory(
  sales: ServiceSaleRecord[]
): Record<ServiceSaleCategory, number> {
  const totals: Record<ServiceSaleCategory, number> = {
    services: 0,
    printing: 0,
    windows: 0,
    other: 0,
  };

  for (const sale of sales) {
    totals[sale.category] += sale.amount;
  }

  return totals;
}

export function createServiceSaleRecord(input: {
  category: ServiceSaleCategory;
  amount: number;
  description?: string;
  staffId?: string;
  staffName?: string;
  now?: Date;
}): ServiceSaleRecord {
  const now = input.now ?? new Date();
  return {
    id: crypto.randomUUID(),
    category: input.category,
    amount: input.amount,
    description: input.description?.trim() || undefined,
    time: formatEntryTime(now),
    createdAt: now.toISOString(),
    staffId: input.staffId,
    staffName: input.staffName,
  };
}

export function appendServiceSaleToNotes(
  notes: string,
  sale: ServiceSaleRecord
): string {
  const { freeText, sales } = parseServiceSalesFromNotes(notes);
  return encodeNotesWithServiceSales(freeText, [...sales, sale]);
}
