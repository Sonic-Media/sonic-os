import Link from "next/link";
import { StockEmptyState } from "@/components/stock/stock-empty-state";
import { StockStatusBadge } from "@/components/stock/stock-status-badge";
import { Card } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { formatCurrency } from "@/lib/format";
import { computeBranchNetQuantity } from "@/lib/stock/calculations";
import { getStockCategoryLabel } from "@/lib/stock/constants";
import { cn } from "@/lib/utils";
import type { BranchEntity } from "@/types/branch";
import type { StockMovement, StockProduct } from "@/types/stock";

interface StockProductsTableProps {
  products: StockProduct[];
  movements: StockMovement[];
  branches: BranchEntity[];
  onEdit?: (product: StockProduct) => void;
  onDelete?: (product: StockProduct) => void;
}

export function StockProductsTable({
  products,
  movements,
  branches,
  onEdit,
  onDelete,
}: StockProductsTableProps) {
  if (products.length === 0) {
    return <StockEmptyState message="No products yet." />;
  }

  const showActions = Boolean(onEdit || onDelete);

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Product
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Category
              </th>
              {branches.map((branch) => (
                <th
                  key={branch.code}
                  className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right"
                >
                  {branch.name} Stock
                </th>
              ))}
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Total Stock
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Buying Price
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Selling Price
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Profit Per Item
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Status
              </th>
              {showActions && (
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const profitPerItem = product.sellingPrice - product.buyingPrice;
              const branchStock = branches.map((branch) =>
                computeBranchNetQuantity(branch.code, product.id, movements)
              );

              return (
                <tr
                  key={product.id}
                  className="border-b border-zinc-800/60 last:border-b-0 transition-colors hover:bg-zinc-900/40"
                >
                  <td className="px-5 py-4 font-medium text-white">
                    <Link
                      href={`/stock/products/${product.id}`}
                      className="transition-colors hover:text-zinc-300"
                    >
                      <div>{product.name}</div>
                    </Link>
                    {product.sku && (
                      <div className="mt-0.5 text-xs text-zinc-500">
                        SKU: {product.sku}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-zinc-400">
                    {getStockCategoryLabel(product.category)}
                  </td>
                  {branchStock.map((quantity, index) => (
                    <td
                      key={`${product.id}-${branches[index]?.code}`}
                      className="px-5 py-4 text-right text-white tabular-nums"
                    >
                      {quantity.toLocaleString("en-UG")}
                    </td>
                  ))}
                  <td className="px-5 py-4 text-right font-medium text-white tabular-nums">
                    {product.currentStock.toLocaleString("en-UG")}
                  </td>
                  <td className="px-5 py-4 text-right text-zinc-400 tabular-nums">
                    {formatCurrency(product.buyingPrice)}
                  </td>
                  <td className="px-5 py-4 text-right text-white tabular-nums">
                    {formatCurrency(product.sellingPrice)}
                  </td>
                  <td
                    className={cn(
                      "px-5 py-4 text-right tabular-nums",
                      profitPerItem >= 0 ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {formatCurrency(profitPerItem)}
                  </td>
                  <td className="px-5 py-4">
                    <StockStatusBadge status={product.status} />
                  </td>
                  {showActions && (
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {onEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9 px-3"
                            onClick={() => onEdit(product)}
                          >
                            Edit
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9 px-3 text-red-400 hover:text-red-300"
                            onClick={() => onDelete(product)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
