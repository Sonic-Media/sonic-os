"use client";

import { SalesEmptyState } from "@/components/sales/sales-empty-state";
import { TablePagination } from "@/components/shared/table-pagination";
import { Card } from "@/components/shared/ui/card";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { formatCurrency } from "@/lib/format";
import { getSalePaymentMethodLabel } from "@/lib/sales/constants";
import { formatSaleItemsSummary } from "@/lib/sales/format";
import { cn } from "@/lib/utils";
import type { Sale, SaleStatus } from "@/types/sales";

interface SalesHistoryTableProps {
  sales: Sale[];
}

const STATUS_STYLES: Record<SaleStatus, string> = {
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  voided: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

function formatSaleDate(date: string): string {
  const parsed = new Date(date + "T12:00:00");
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

export function SalesHistoryTable({ sales }: SalesHistoryTableProps) {
  const pagination = usePaginatedList(sales);
  const { pageItems } = pagination;

  if (sales.length === 0) {
    return <SalesEmptyState message="No accessory sales match your filters." />;
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Invoice Number
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Date
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Customer
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Items
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Revenue
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Profit
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Payment Method
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((sale) => (
              <tr
                key={sale.id}
                className="border-b border-zinc-800/60 last:border-b-0 transition-colors hover:bg-zinc-900/40"
              >
                <td className="px-5 py-4 font-medium text-white">
                  {sale.invoiceNumber}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {formatSaleDate(sale.date)}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {sale.customerName || "—"}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {formatSaleItemsSummary(sale.items)}
                </td>
                <td className="px-5 py-4 text-right text-white tabular-nums">
                  {formatCurrency(sale.total)}
                </td>
                <td
                  className={cn(
                    "px-5 py-4 text-right tabular-nums",
                    sale.profit >= 0 ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {formatCurrency(sale.profit)}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {getSalePaymentMethodLabel(sale.paymentMethod)}
                </td>
                <td className="px-5 py-4">
                  <SaleStatusBadge status={sale.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        onPrevious={pagination.goToPreviousPage}
        onNext={pagination.goToNextPage}
      />
    </Card>
  );
}
