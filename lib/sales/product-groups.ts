import { getStockCategoryLabel } from "@/lib/stock/constants";
import { computeProductStatus } from "@/lib/stock/product-status";
import type { BranchSaleProduct } from "@/types/sales";
import type { StockProduct, StockProductCategory, StockProductStatus } from "@/types/stock";

export type SalesCatalogFilter =
  | "all"
  | "accessories"
  | "movies"
  | "electronics"
  | "other";

export const SALES_CATALOG_FILTERS: { id: SalesCatalogFilter; label: string }[] = [
  { id: "all", label: "All Items" },
  { id: "accessories", label: "Accessories" },
  { id: "movies", label: "Movies" },
  { id: "electronics", label: "Electronics" },
  { id: "other", label: "Other" },
];

const ACCESSORY_CATEGORIES = new Set<StockProductCategory>([
  "flash-disks",
  "usb-cables",
  "chargers",
  "earphones",
  "phone-accessories",
  "computer-accessories",
]);

const ELECTRONICS_CATEGORIES = new Set<StockProductCategory>([
  "hard-drives",
  "networking-equipment",
  "bluetooth-speakers",
  "game-controllers",
  "hdmi-cables",
]);

export interface SaleCatalogProduct extends BranchSaleProduct {
  category: StockProductCategory;
  categoryLabel: string;
  stockStatus: StockProductStatus;
}

export function enrichBranchSaleProducts(
  branchProducts: BranchSaleProduct[],
  stockProducts: StockProduct[]
): SaleCatalogProduct[] {
  const stockById = new Map(stockProducts.map((product) => [product.id, product]));

  return branchProducts.map((product) => {
    const stock = stockById.get(product.id);
    const category = stock?.category ?? "other-accessories";
    const minimumStockLevel = stock?.minimumStockLevel ?? 0;

    return {
      ...product,
      category,
      categoryLabel: getStockCategoryLabel(category),
      stockStatus: computeProductStatus(product.branchStock, minimumStockLevel),
    };
  });
}

export function matchesSalesCatalogFilter(
  product: SaleCatalogProduct,
  filter: SalesCatalogFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "movies") return false;
  if (filter === "other") return product.category === "other-accessories";
  if (filter === "electronics") return ELECTRONICS_CATEGORIES.has(product.category);
  if (filter === "accessories") return ACCESSORY_CATEGORIES.has(product.category);
  return true;
}

export function filterSaleCatalogProducts(
  products: SaleCatalogProduct[],
  filter: SalesCatalogFilter,
  search: string
): SaleCatalogProduct[] {
  const normalized = search.trim().toLowerCase();

  return products.filter((product) => {
    if (!matchesSalesCatalogFilter(product, filter)) return false;
    if (!normalized) return true;

    return (
      product.name.toLowerCase().includes(normalized) ||
      product.categoryLabel.toLowerCase().includes(normalized)
    );
  });
}
