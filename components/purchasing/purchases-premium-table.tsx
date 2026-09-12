"use client";

import Link from "next/link";
import { PurchaseStatusBadge } from "@/components/purchasing/purchase-status-badge";
import { PurchasingEmptyState } from "@/components/purchasing/purchasing-empty-state";
import { TablePagination } from "@/components/shared/table-pagination";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { formatCurrency } from "@/lib/format";
import { formatPurchaseItemsSummary } from "@/lib/purchasing/format";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { Purchase } from "@/types/purchasing";
import { cn } from "@/lib/utils";

interface PurchasesPremiumTableProps {
  purchases: Purchase[];
}

function formatPurchaseDate(date: string): string {
  const parsed = new Date(date + "T12:00:00");
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PurchasesPremiumTable({ purchases }: PurchasesPremiumTableProps) {
  const pagination = usePaginatedList(purchases);
  const { pageItems } = pagination;

  if (purchases.length === 0) {
    return (
      <section className={cn(uiSurface.card, "overflow-hidden p-0")}>
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Purchases</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Stock purchases and supplier payments
          </p>
        </div>
        <PurchasingEmptyState message="No purchases match your filters." />
      </section>
    );
  }

  return (
    <section className={cn(uiSurface.card, "overflow-hidden p-0")}>
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Purchases</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Stock purchases and supplier payments
        </p>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Supplier</th>
              <th className="px-3 py-3 font-medium">Items</th>
              <th className="px-3 py-3 font-medium text-right">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((purchase) => (
              <tr
                key={purchase.id}
                className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]"
              >
                <td className="px-5 py-3.5 text-zinc-400">
                  <Link
                    href={`/purchasing/${purchase.id}`}
                    className="transition-colors hover:text-white"
                  >
                    {formatPurchaseDate(purchase.date)}
                  </Link>
                </td>
                <td className="px-3 py-3.5 font-medium text-white">
                  {purchase.supplierName}
                </td>
                <td className="px-3 py-3.5 text-zinc-400">
                  {formatPurchaseItemsSummary(purchase.items)}
                </td>
                <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-white">
                  {formatCurrency(purchase.totalCost)}
                </td>
                <td className="px-5 py-3.5">
                  <PurchaseStatusBadge purchase={purchase} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 p-3 lg:hidden">
        {pageItems.map((purchase) => (
          <Link
            key={purchase.id}
            href={`/purchasing/${purchase.id}`}
            className="block rounded-xl border border-white/[0.06] bg-black/20 p-3 transition-colors hover:border-white/[0.1]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{purchase.supplierName}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatPurchaseDate(purchase.date)} ·{" "}
                  {formatPurchaseItemsSummary(purchase.items)}
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums text-white">
                {formatCurrency(purchase.totalCost)}
              </p>
            </div>
            <div className="mt-3">
              <PurchaseStatusBadge purchase={purchase} />
            </div>
          </Link>
        ))}
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
    </section>
  );
}
