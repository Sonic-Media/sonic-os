import { Card } from "@/components/shared/ui/card";
import { TotalsField } from "@/components/shared/totals-grid";
import { formatCurrency } from "@/lib/format";
import { PURCHASING_PLACEHOLDER } from "@/lib/purchasing/format";
import type { Purchase } from "@/types/purchasing";

interface PurchaseDetailCardProps {
  purchase: Purchase;
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

export function PurchaseDetailCard({ purchase }: PurchaseDetailCardProps) {
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">
          {purchase.invoiceNumber}
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TotalsField label="Supplier" value={purchase.supplierName} />
          <TotalsField
            label="Date"
            value={formatPurchaseDate(purchase.date)}
          />
          <TotalsField
            label="Staff"
            value={purchase.staffName || PURCHASING_PLACEHOLDER}
            valueClassName={
              purchase.staffName ? undefined : "text-zinc-500 font-medium"
            }
          />
          <TotalsField
            label="Notes"
            value={purchase.notes || PURCHASING_PLACEHOLDER}
            valueClassName={
              purchase.notes ? undefined : "text-zinc-500 font-medium"
            }
          />
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Items
        </h2>
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
                  <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Product
                  </th>
                  <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                    Qty
                  </th>
                  <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                    Buying Price
                  </th>
                  <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item) => (
                  <tr
                    key={`${purchase.id}-${item.productId}`}
                    className="border-b border-zinc-800/60 last:border-b-0"
                  >
                    <td className="px-5 py-4 font-medium text-white">
                      {item.productName}
                    </td>
                    <td className="px-5 py-4 text-right text-white tabular-nums">
                      {item.quantity.toLocaleString("en-UG")}
                    </td>
                    <td className="px-5 py-4 text-right text-zinc-400 tabular-nums">
                      {formatCurrency(item.buyingPrice)}
                    </td>
                    <td className="px-5 py-4 text-right text-white tabular-nums">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-800/80 bg-zinc-900/40">
                  <td
                    colSpan={3}
                    className="px-5 py-4 text-right text-sm font-medium text-zinc-400"
                  >
                    Grand Total
                  </td>
                  <td className="px-5 py-4 text-right text-base font-semibold text-white tabular-nums">
                    {formatCurrency(purchase.totalCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
