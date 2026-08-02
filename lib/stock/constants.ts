import type {
  StockCategoryFilter,
  StockMovementType,
  StockProductCategory,
  StockProductSortField,
  StockProductStatus,
  StockStatusFilter,
} from "@/types/stock";

export const STOCK_PRODUCT_CATEGORIES: {
  id: StockProductCategory;
  label: string;
}[] = [
  { id: "flash-disks", label: "Flash Disks" },
  { id: "hard-drives", label: "Hard Drives" },
  { id: "usb-cables", label: "USB Cables" },
  { id: "chargers", label: "Chargers" },
  { id: "earphones", label: "Earphones" },
  { id: "bluetooth-speakers", label: "Bluetooth Speakers" },
  { id: "hdmi-cables", label: "HDMI Cables" },
  { id: "game-controllers", label: "Game Controllers" },
  { id: "phone-accessories", label: "Phone Accessories" },
  { id: "computer-accessories", label: "Computer Accessories" },
  { id: "networking-equipment", label: "Networking Equipment" },
  { id: "other-accessories", label: "Other Accessories" },
];

export const STOCK_CATEGORY_FILTER_OPTIONS: {
  id: StockCategoryFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  ...STOCK_PRODUCT_CATEGORIES,
];

export const STOCK_STATUS_OPTIONS: {
  id: StockProductStatus;
  label: string;
}[] = [
  { id: "in-stock", label: "🟢 In Stock" },
  { id: "low-stock", label: "🟡 Low Stock" },
  { id: "out-of-stock", label: "🔴 Out of Stock" },
];

export const STOCK_PRODUCT_SORT_OPTIONS: {
  id: StockProductSortField;
  label: string;
}[] = [
  { id: "name", label: "Name" },
  { id: "stock", label: "Stock" },
  { id: "buying-price", label: "Buying Price" },
  { id: "selling-price", label: "Selling Price" },
  { id: "profit", label: "Profit" },
];

export const STOCK_MOVEMENT_REASONS: Record<StockMovementType, string[]> = {
  in: ["Purchase", "Return", "Opening Balance", "Adjustment", "Other"],
  out: ["Sale", "Damage", "Transfer", "Sample", "Other"],
};

export const STOCK_STATUS_FILTER_OPTIONS: {
  id: StockStatusFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  ...STOCK_STATUS_OPTIONS,
];

export const STOCK_NAV_ITEMS: {
  href: string;
  label: string;
  exact?: boolean;
}[] = [
  { href: "/stock", label: "Dashboard", exact: true },
  { href: "/stock/products", label: "Products" },
  { href: "/stock/movement", label: "Stock Movement" },
];

export function getStockCategoryLabel(category: StockProductCategory): string {
  return (
    STOCK_PRODUCT_CATEGORIES.find((item) => item.id === category)?.label ??
    category
  );
}

export function getStockStatusLabel(status: StockProductStatus): string {
  return (
    STOCK_STATUS_OPTIONS.find((item) => item.id === status)?.label ?? status
  );
}
