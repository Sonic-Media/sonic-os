import Link from "next/link";
import { PurchasingEmptyState } from "@/components/purchasing/purchasing-empty-state";
import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import { formatPurchaseItemsSummary } from "@/lib/purchasing/format";
import type { Purchase } from "@/types/purchasing";

interface PurchaseHistoryTableProps {
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

export function PurchaseHistoryTable({
  purchases,
}: PurchaseHistoryTableProps) {
  if (purchases.length === 0) {
    return <PurchasingEmptyState message="No purchases match your filters." />;
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Invoice
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Date
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Supplier
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Items
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Total
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Staff
              </th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr
                key={purchase.id}
                className="border-b border-zinc-800/60 last:border-b-0 transition-colors hover:bg-zinc-900/40"
              >
                <td className="px-5 py-4 font-medium text-white">
                  <Link
                    href={`/purchasing/${purchase.id}`}
                    className="transition-colors hover:text-zinc-300"
                  >
                    {purchase.invoiceNumber}
                  </Link>
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {formatPurchaseDate(purchase.date)}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {purchase.supplierName}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {formatPurchaseItemsSummary(purchase.items)}
                </td>
                <td className="px-5 py-4 text-right text-white tabular-nums">
                  {formatCurrency(purchase.totalCost)}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {purchase.staffName || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
