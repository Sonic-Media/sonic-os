"use client";

import { useState } from "react";
import { CustomerDialog } from "@/components/sales/customer-dialog";
import { CustomersTable } from "@/components/sales/customers-table";
import { SalesSubnav } from "@/components/sales/sales-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { useSales } from "@/context/sales-context";
import { useSalesCustomers } from "@/hooks/use-sales-customers";
import type { CustomerWithStats } from "@/types/sales";

export default function SalesCustomersPage() {
  const { deleteCustomer } = useSales();
  const { customers } = useSalesCustomers();
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithStats | null>(null);

  function openAddCustomer() {
    setSelectedCustomer(null);
    setDialogMode("add");
  }

  function openEditCustomer(customer: CustomerWithStats) {
    setSelectedCustomer(customer);
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedCustomer(null);
  }

  function handleDelete(customer: CustomerWithStats) {
    const confirmed = window.confirm(
      `Delete ${customer.name}? This cannot be undone.`
    );
    if (!confirmed) return;

    const result = deleteCustomer(customer.id);
    if (!result.success) {
      window.alert(result.errors.form ?? "Unable to delete this customer.");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Customers"
        subtitle="Customer database and purchase history"
        showBranchBadge
      />

      <div className="mb-6 flex justify-end">
        <Button type="button" onClick={openAddCustomer}>
          Add Customer
        </Button>
      </div>

      <SalesSubnav />

      <CustomersTable
        customers={customers}
        onEdit={openEditCustomer}
        onDelete={handleDelete}
      />

      {dialogMode === "add" && (
        <CustomerDialog mode="add" onClose={closeDialog} />
      )}

      {dialogMode === "edit" && selectedCustomer && (
        <CustomerDialog
          mode="edit"
          customer={selectedCustomer}
          onClose={closeDialog}
        />
      )}
    </PageContainer>
  );
}
