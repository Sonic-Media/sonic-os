import { isCashierRole } from "@/lib/auth/permissions";
import { SALES_NAV_ITEMS } from "@/lib/sales/constants";
import type { UserRole } from "@/types/auth";

export function getVisibleSalesNavItems(role: UserRole) {
  if (!isCashierRole(role)) {
    return SALES_NAV_ITEMS;
  }

  return SALES_NAV_ITEMS.filter(
    (item) => item.href === "/sales" || item.href === "/sales/new"
  );
}
