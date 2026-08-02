import { useSales } from "@/context/sales-context";
import { useMemo } from "react";
import { computeCustomerStats } from "@/lib/sales/calculations";

export function useSalesCustomers() {
  const { customers, sales } = useSales();

  const customersWithStats = useMemo(
    () => customers.map((customer) => computeCustomerStats(customer, sales)),
    [customers, sales]
  );

  return { customers: customersWithStats };
}
