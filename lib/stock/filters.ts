import { computeProfitPerItem } from "@/lib/stock/calculations";
import { getStockCategoryLabel } from "@/lib/stock/constants";
import type {
  StockProduct,
  StockProductFilterCriteria,
  StockProductSortField,
  StockProductSortOrder,
} from "@/types/stock";

function filterBySearch(
  products: StockProduct[],
  criteria: StockProductFilterCriteria
): StockProduct[] {
  const query = criteria.search.trim().toLowerCase();
  if (!query) return products;

  return products.filter((product) => {
    const haystack = [
      product.name,
      product.sku ?? "",
      getStockCategoryLabel(product.category),
      product.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function filterByCategory(
  products: StockProduct[],
  criteria: StockProductFilterCriteria
): StockProduct[] {
  if (criteria.category === "all") return products;
  return products.filter((product) => product.category === criteria.category);
}

function filterByStatus(
  products: StockProduct[],
  criteria: StockProductFilterCriteria
): StockProduct[] {
  if (criteria.status === "all") return products;
  return products.filter((product) => product.status === criteria.status);
}

const STOCK_PRODUCT_FILTERS = [filterBySearch, filterByCategory, filterByStatus];

export function applyStockProductFilters(
  products: StockProduct[],
  criteria: StockProductFilterCriteria
): StockProduct[] {
  return STOCK_PRODUCT_FILTERS.reduce(
    (result, filter) => filter(result, criteria),
    products
  );
}

function getSortValue(
  product: StockProduct,
  field: StockProductSortField
): string | number {
  switch (field) {
    case "name":
      return product.name.toLowerCase();
    case "stock":
      return product.currentStock;
    case "buying-price":
      return product.buyingPrice;
    case "selling-price":
      return product.sellingPrice;
    case "profit":
      return computeProfitPerItem(product.buyingPrice, product.sellingPrice);
    default:
      return product.name.toLowerCase();
  }
}

export function sortStockProducts(
  products: StockProduct[],
  field: StockProductSortField,
  order: StockProductSortOrder
): StockProduct[] {
  const direction = order === "asc" ? 1 : -1;

  return [...products].sort((left, right) => {
    const leftValue = getSortValue(left, field);
    const rightValue = getSortValue(right, field);

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * direction;
    }

    return String(leftValue).localeCompare(String(rightValue)) * direction;
  });
}

export function createDefaultStockProductFilterCriteria(): StockProductFilterCriteria {
  return {
    search: "",
    category: "all",
    status: "all",
    sortField: "name",
    sortOrder: "asc",
  };
}
