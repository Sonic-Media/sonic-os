"use client";

import { useState } from "react";
import { PurchasingSubnav } from "@/components/purchasing/purchasing-subnav";
import { SupplierDialog } from "@/components/purchasing/supplier-dialog";
import { SuppliersTable } from "@/components/purchasing/suppliers-table";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { usePurchasing } from "@/context/purchasing-context";
import { usePurchasingSuppliers } from "@/hooks/use-purchasing-suppliers";
import type { SupplierWithStats } from "@/types/purchasing";

export default function PurchasingSuppliersPage() {
  const { deleteSupplier } = usePurchasing();
  const { suppliers } = usePurchasingSuppliers();
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [selectedSupplier, setSelectedSupplier] =
    useState<SupplierWithStats | null>(null);

  function openAddSupplier() {
    setSelectedSupplier(null);
    setDialogMode("add");
  }

  function openEditSupplier(supplier: SupplierWithStats) {
    setSelectedSupplier(supplier);
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedSupplier(null);
  }

  function handleDelete(supplier: SupplierWithStats) {
    const confirmed = window.confirm(
      `Delete ${supplier.name}? This cannot be undone.`
    );
    if (!confirmed) return;

    const result = deleteSupplier(supplier.id);
    if (!result.success) {
      window.alert(result.errors.form ?? "Unable to delete this supplier.");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Suppliers"
        subtitle="Supplier database and purchase history"
      />

      <div className="mb-6 flex justify-end">
        <Button type="button" onClick={openAddSupplier}>
          Add Supplier
        </Button>
      </div>

      <PurchasingSubnav />

      <SuppliersTable
        suppliers={suppliers}
        onEdit={openEditSupplier}
        onDelete={handleDelete}
      />

      {dialogMode === "add" && (
        <SupplierDialog mode="add" onClose={closeDialog} />
      )}

      {dialogMode === "edit" && selectedSupplier && (
        <SupplierDialog
          mode="edit"
          supplier={selectedSupplier}
          onClose={closeDialog}
        />
      )}
    </PageContainer>
  );
}
