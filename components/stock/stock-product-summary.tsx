import { StockStatusBadge } from "@/components/stock/stock-status-badge";
import { Card } from "@/components/shared/ui/card";
import { TotalsField } from "@/components/shared/totals-grid";
import { formatCurrency } from "@/lib/format";
import {
  computeInventoryValue,
  computePotentialProfit,
  computePotentialSalesValue,
  computeProfitPerItem,
} from "@/lib/stock/calculations";
import { getStockCategoryLabel } from "@/lib/stock/constants";
import { STOCK_PLACEHOLDER } from "@/lib/stock/format";
import { cn } from "@/lib/utils";
import type { StockProduct } from "@/types/stock";

interface StockProductSummaryProps {
  product: StockProduct;
}

export function StockProductSummary({ product }: StockProductSummaryProps) {
  const profitPerUnit = computeProfitPerItem(
    product.buyingPrice,
    product.sellingPrice
  );
  const inventoryValue = computeInventoryValue(product);
  const potentialSalesValue = computePotentialSalesValue(product);
  const potentialProfit = computePotentialProfit(product);

  return (
    <Card>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{product.name}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {getStockCategoryLabel(product.category)}
          </p>
        </div>
        <StockStatusBadge status={product.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TotalsField
          label="SKU"
          value={product.sku || STOCK_PLACEHOLDER}
          valueClassName={product.sku ? undefined : "text-zinc-500 font-medium"}
        />
        <TotalsField
          label="Buying Price"
          value={formatCurrency(product.buyingPrice)}
        />
        <TotalsField
          label="Selling Price"
          value={formatCurrency(product.sellingPrice)}
        />
        <TotalsField
          label="Profit Per Unit"
          value={formatCurrency(profitPerUnit)}
          valueClassName={cn(
            profitPerUnit >= 0 ? "text-emerald-400" : "text-red-400"
          )}
        />
        <TotalsField
          label="Current Stock"
          value={product.currentStock.toLocaleString("en-UG")}
        />
        <TotalsField
          label="Minimum Stock"
          value={product.minimumStockLevel.toLocaleString("en-UG")}
        />
        <TotalsField
          label="Inventory Value"
          value={formatCurrency(inventoryValue)}
        />
        <TotalsField
          label="Potential Sales Value"
          value={formatCurrency(potentialSalesValue)}
        />
        <TotalsField
          label="Potential Profit"
          value={formatCurrency(potentialProfit)}
          valueClassName={cn(
            potentialProfit >= 0 ? "text-emerald-400" : "text-red-400"
          )}
        />
        <TotalsField
          label="Current Status"
          value={product.status.replace(/-/g, " ")}
          valueClassName="capitalize"
        />
      </div>
    </Card>
  );
}
