import { filterByBranchField } from "@/lib/active-branch/filters";
import {
  parseServiceSalesFromNotes,
  sumServiceSales,
  sumServiceSalesByCategory,
} from "@/lib/staff-home/service-sales";
import type { Branch, Entry } from "@/types";
import type { Sale } from "@/types/sales";

export interface StaffHomeRevenueBreakdown {
  movies: number;
  accessories: number;
  services: number;
  printing: number;
  windows: number;
  other: number;
  total: number;
}

export function computeStaffHomeRevenue(input: {
  branch: Branch;
  date: string;
  movieRevenue: number;
  sales: Sale[];
  entryNotes?: string | null;
}): StaffHomeRevenueBreakdown {
  const accessories = filterByBranchField(input.sales, input.branch)
    .filter(
      (sale) => sale.date === input.date && sale.status === "completed"
    )
    .reduce((sum, sale) => sum + sale.total, 0);

  const { sales: serviceSales } = parseServiceSalesFromNotes(input.entryNotes);
  const byCategory = sumServiceSalesByCategory(serviceSales);

  const movies = Math.max(0, input.movieRevenue);
  const total =
    movies +
    accessories +
    byCategory.services +
    byCategory.printing +
    byCategory.windows +
    byCategory.other;

  return {
    movies,
    accessories,
    services: byCategory.services,
    printing: byCategory.printing,
    windows: byCategory.windows,
    other: byCategory.other,
    total,
  };
}

export function getServiceSalesTotalFromEntry(
  entry?: Pick<Entry, "notes"> | null
): number {
  if (!entry) return 0;
  return sumServiceSales(parseServiceSalesFromNotes(entry.notes).sales);
}

export function getServiceSalesTotalFromNotes(notes?: string | null): number {
  return sumServiceSales(parseServiceSalesFromNotes(notes).sales);
}
