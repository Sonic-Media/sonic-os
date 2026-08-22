import { SalesEmptyState } from "@/components/sales/sales-empty-state";
import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import { getSalePaymentMethodLabel } from "@/lib/sales/constants";
import { formatSaleItemsSummary } from "@/lib/sales/format";
import type { Sale } from "@/types/sales";

interface SalesRecentSalesProps {
  sales: Sale[];
  title?: string;
  limit?: number;
}

function formatSaleDate(date: string): string {
  const parsed = new Date(date + "T12:00:00");
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SalesRecentSales({
  sales,
  title = "Recent Accessory Sales",
  limit = 5,
}: SalesRecentSalesProps) {
  const recentSales = sales
    .filter((sale) => sale.status === "completed")
    .slice(0, limit);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </h2>

      {recentSales.length === 0 ? (
        <SalesEmptyState message="No accessory sales recorded yet." />
      ) : (
        <div className="space-y-2">
          {recentSales.map((sale) => (
            <Card
              key={sale.id}
              className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {sale.invoiceNumber}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatSaleDate(sale.date)} · {sale.time}
                  {sale.customerName ? ` · ${sale.customerName}` : ""}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {formatSaleItemsSummary(sale.items)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-semibold text-white">
                  {formatCurrency(sale.total)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {getSalePaymentMethodLabel(sale.paymentMethod)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
