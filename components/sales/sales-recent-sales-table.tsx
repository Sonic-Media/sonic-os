"use client";

import { formatCurrency } from "@/lib/format";
import { getSalePaymentMethodLabel } from "@/lib/sales/constants";
import { formatSaleItemsSummary } from "@/lib/sales/format";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { Sale } from "@/types/sales";
import { cn } from "@/lib/utils";

interface SalesRecentSalesTableProps {
  sales: Sale[];
  title?: string;
}

export function SalesRecentSalesTable({
  sales,
  title = "Recent Sales",
}: SalesRecentSalesTableProps) {
  return (
    <section className={cn(uiSurface.card, "overflow-hidden p-0")}>
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Today&apos;s completed accessory sales</p>
      </div>

      {sales.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          No sales recorded yet today.
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-3 py-3 font-medium">Time</th>
                  <th className="px-3 py-3 font-medium">Items</th>
                  <th className="px-3 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5 font-medium text-white">
                      {sale.invoiceNumber}
                    </td>
                    <td className="px-3 py-3.5 text-zinc-400">{sale.time}</td>
                    <td className="px-3 py-3.5 text-zinc-400">
                      {formatSaleItemsSummary(sale.items)}
                    </td>
                    <td className="px-3 py-3.5 text-zinc-400">
                      {getSalePaymentMethodLabel(sale.paymentMethod)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-white">
                      {formatCurrency(sale.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 p-3 lg:hidden">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="rounded-xl border border-white/[0.06] bg-black/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{sale.invoiceNumber}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {sale.time} · {getSalePaymentMethodLabel(sale.paymentMethod)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatSaleItemsSummary(sale.items)}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums text-white">
                    {formatCurrency(sale.total)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
