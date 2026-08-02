import { PurchasingEmptyState } from "@/components/purchasing/purchasing-empty-state";
import { Card } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { formatCurrency } from "@/lib/format";
import { PURCHASING_PLACEHOLDER } from "@/lib/purchasing/format";
import type { SupplierWithStats } from "@/types/purchasing";

interface SuppliersTableProps {
  suppliers: SupplierWithStats[];
  onEdit?: (supplier: SupplierWithStats) => void;
  onDelete?: (supplier: SupplierWithStats) => void;
}

function formatPurchaseDate(date: string | null): string {
  if (!date) return PURCHASING_PLACEHOLDER;

  const parsed = new Date(date + "T12:00:00");
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SuppliersTable({
  suppliers,
  onEdit,
  onDelete,
}: SuppliersTableProps) {
  if (suppliers.length === 0) {
    return <PurchasingEmptyState message="No suppliers yet." />;
  }

  const showActions = Boolean(onEdit || onDelete);

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
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
                Total Purchases
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Total Amount Purchased
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Last Purchase Date
              </th>
              {showActions && (
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr
                key={supplier.id}
                className="border-b border-zinc-800/60 last:border-b-0 transition-colors hover:bg-zinc-900/40"
              >
                <td className="px-5 py-4 font-medium text-white">
                  {supplier.name}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {supplier.phone || PURCHASING_PLACEHOLDER}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {supplier.email || PURCHASING_PLACEHOLDER}
                </td>
                <td className="px-5 py-4 text-right text-white tabular-nums">
                  {supplier.totalPurchases.toLocaleString("en-UG")}
                </td>
                <td className="px-5 py-4 text-right text-white tabular-nums">
                  {formatCurrency(supplier.totalAmountPurchased)}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {formatPurchaseDate(supplier.lastPurchaseDate)}
                </td>
                {showActions && (
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-3"
                          onClick={() => onEdit(supplier)}
                        >
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-3 text-red-400 hover:text-red-300"
                          onClick={() => onDelete(supplier)}
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
