import { useSales } from "@/context/sales-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useMemo } from "react";
import { computeCustomerStats } from "@/lib/sales/calculations";
import { filterByBranchField } from "@/lib/active-branch/filters";

export function useSalesCustomers() {
  const { customers, sales } = useSales();
  const { activeBranch } = useActiveBranch();

  const customersWithStats = useMemo(() => {
    const branchSales = filterByBranchField(sales, activeBranch);
    return customers.map((customer) =>
      computeCustomerStats(customer, branchSales)
    );
  }, [customers, sales, activeBranch]);

  return { customers: customersWithStats };
}
