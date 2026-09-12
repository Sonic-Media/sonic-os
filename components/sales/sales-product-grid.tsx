"use client";

import { formatCurrency } from "@/lib/format";
import type { SaleCatalogProduct } from "@/lib/sales/product-groups";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { StockProductStatus } from "@/types/stock";
import { cn } from "@/lib/utils";

function ProductIcon({ category }: { category: string }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    </span>
  );
}

function StockStatusBadge({ status }: { status: StockProductStatus }) {
  const styles = {
    "in-stock": "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    "low-stock": "bg-orange-500/10 text-orange-400 ring-orange-500/20",
    "out-of-stock": "bg-red-500/10 text-red-400 ring-red-500/20",
  }[status];

  const label = {
    "in-stock": "In Stock",
    "low-stock": "Low Stock",
    "out-of-stock": "Out of Stock",
  }[status];

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium ring-1", styles)}>
      {label}
    </span>
  );
}

interface SalesProductGridProps {
  products: SaleCatalogProduct[];
  onSelect: (product: SaleCatalogProduct) => void;
  selectedProductId?: string;
  emptyMessage?: string;
}

export function SalesProductGrid({
  products,
  onSelect,
  selectedProductId,
  emptyMessage = "No products match the current filters.",
}: SalesProductGridProps) {
  if (products.length === 0) {
    return (
      <div className={cn(uiSurface.card, "p-8 text-center")}>
        <p className="text-sm text-zinc-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const isSelected = product.id === selectedProductId;
        const disabled = product.stockStatus === "out-of-stock";

        return (
          <button
            key={product.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(product)}
            className={cn(
              uiSurface.card,
              "p-4 text-left transition-all duration-200",
              isSelected && "ring-1 ring-blue-500/35 bg-blue-500/[0.06]",
              disabled
                ? "cursor-not-allowed opacity-50"
                : "hover:border-white/[0.12] hover:-translate-y-0.5"
            )}
          >
            <div className="flex items-start gap-3">
              <ProductIcon category={product.category} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{product.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{product.categoryLabel}</p>
                <p className="mt-2 text-sm font-semibold text-white tabular-nums">
                  {formatCurrency(product.sellingPrice)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StockStatusBadge status={product.stockStatus} />
                  <span className="text-[10px] text-zinc-500">
                    {product.branchStock.toLocaleString("en-UG")} available
                  </span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
