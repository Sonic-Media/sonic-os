import { SalesEmptyState } from "@/components/sales/sales-empty-state";
import { Card } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { formatCurrency } from "@/lib/format";
import { SALES_PLACEHOLDER } from "@/lib/sales/format";
import type { CustomerWithStats } from "@/types/sales";

interface CustomersTableProps {
  customers: CustomerWithStats[];
  onEdit?: (customer: CustomerWithStats) => void;
  onDelete?: (customer: CustomerWithStats) => void;
}

function formatPurchaseDate(date: string | null): string {
  if (!date) return SALES_PLACEHOLDER;

  const parsed = new Date(date + "T12:00:00");
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CustomersTable({
  customers,
  onEdit,
  onDelete,
}: CustomersTableProps) {
  if (customers.length === 0) {
    return <SalesEmptyState message="No customers yet." />;
  }

  const showActions = Boolean(onEdit || onDelete);

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Name
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Phone
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Email
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Purchases
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Lifetime Spend
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Last Purchase
              </th>
              {showActions && (
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-zinc-800/60 last:border-b-0 transition-colors hover:bg-zinc-900/40"
              >
                <td className="px-5 py-4 font-medium text-white">
                  {customer.name}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {customer.phone || SALES_PLACEHOLDER}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {customer.email || SALES_PLACEHOLDER}
                </td>
                <td className="px-5 py-4 text-right text-white tabular-nums">
                  {customer.purchaseCount.toLocaleString("en-UG")}
                </td>
                <td className="px-5 py-4 text-right text-white tabular-nums">
                  {formatCurrency(customer.lifetimeSpend)}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {formatPurchaseDate(customer.lastPurchaseDate)}
                </td>
                {showActions && (
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-3"
                          onClick={() => onEdit(customer)}
                        >
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-3 text-red-400 hover:text-red-300"
                          onClick={() => onDelete(customer)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
