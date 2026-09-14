"use client";

import Link from "next/link";
import { StockEmptyState } from "@/components/stock/stock-empty-state";
import { StockStatusBadge } from "@/components/stock/stock-status-badge";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/shared/ui/button";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { formatCurrency } from "@/lib/format";
import { getStockCategoryLabel } from "@/lib/stock/constants";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { StockProduct } from "@/types/stock";
import { cn } from "@/lib/utils";

interface StockPremiumTableProps {
  products: StockProduct[];
  onEdit?: (product: StockProduct) => void;
  onDelete?: (product: StockProduct) => void;
}

export function StockPremiumTable({
  products,
  onEdit,
  onDelete,
}: StockPremiumTableProps) {
  const pagination = usePaginatedList(products);
  const { pageItems } = pagination;
  const showActions = Boolean(onEdit || onDelete);

  if (products.length === 0) {
    return (
      <section className={cn(uiSurface.card, "overflow-hidden p-0")}>
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Inventory</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Products and stock levels for the selected branch
          </p>
        </div>
        <StockEmptyState message="No items match your filters." />
      </section>
    );
  }

  return (
    <section className={cn(uiSurface.card, "overflow-hidden p-0")}>
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Inventory</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Products and stock levels for the selected branch
        </p>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-3 py-3 font-medium">Category</th>
              <th className="px-3 py-3 font-medium text-right">Current Stock</th>
              <th className="px-3 py-3 font-medium text-right">Selling Price</th>
              <th className="px-3 py-3 font-medium">Status</th>
              {showActions ? (
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((product) => (
              <tr
                key={product.id}
                className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]"
              >
                <td className="px-5 py-3.5">
                  <Link
                    href={`/stock/products/${product.id}`}
                    className="font-medium text-white transition-colors hover:text-violet-300"
                  >
                    {product.name}
                  </Link>
                  {product.sku ? (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      SKU: {product.sku}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3.5 text-zinc-400">
                  {getStockCategoryLabel(product.category)}
                </td>
                <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-white">
                  {product.currentStock.toLocaleString("en-UG")}
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-zinc-300">
                  {formatCurrency(product.sellingPrice)}
                </td>
                <td className="px-3 py-3.5">
                  <StockStatusBadge status={product.status} />
                </td>
                {showActions ? (
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-3"
                          onClick={() => onEdit(product)}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-3 text-red-400 hover:text-red-300"
                          onClick={() => onDelete(product)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 p-3 lg:hidden">
        {pageItems.map((product) => (
          <div
            key={product.id}
            className="rounded-xl border border-white/[0.06] bg-black/20 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/stock/products/${product.id}`}
                  className="font-medium text-white transition-colors hover:text-violet-300"
                >
                  {product.name}
                </Link>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {getStockCategoryLabel(product.category)} ·{" "}
                  {product.currentStock.toLocaleString("en-UG")} in stock
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums text-white">
                {formatCurrency(product.sellingPrice)}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <StockStatusBadge status={product.status} />
              {showActions ? (
                <div className="flex gap-2">
                  {onEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-3"
                      onClick={() => onEdit(product)}
                    >
                      Edit
                    </Button>
                  ) : null}
                  {onDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-3 text-red-400 hover:text-red-300"
                      onClick={() => onDelete(product)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
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
