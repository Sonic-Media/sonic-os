"use client";

import { StockPageFilters } from "@/components/stock/stock-page-filters";
import { StockPageKpis } from "@/components/stock/stock-page-kpis";
import { StockPremiumTable } from "@/components/stock/stock-premium-table";
import { StockSubnav } from "@/components/stock/stock-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useStockPage } from "@/hooks/use-stock-page";
import { useStockDialogs } from "@/hooks/use-stock-dialogs";

export function StockWorkspace() {
  const {
    isLoaded,
    canSwitchBranch,
    getBranchName,
    activeBranches,
    filteredProducts,
    kpis,
    branchFilter,
    setBranchFilter,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
  } = useStockPage();
  const {
    openAddProduct,
    openEditProduct,
    openDeleteProduct,
    renderDialogs,
  } = useStockDialogs();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer className="space-y-6 pb-10">
      <PageHeader
        title="Stock / Inventory"
        subtitle="Manage your inventory across branches"
        showBranchBadge={!canSwitchBranch}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" onClick={openAddProduct}>
          + Add Item
        </Button>
      </div>

      <StockSubnav />

      <StockPageFilters
        canSwitchBranch={canSwitchBranch}
        activeBranches={activeBranches}
        getBranchName={getBranchName}
        branchFilter={branchFilter}
        onBranchFilterChange={setBranchFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        search={search}
        onSearchChange={setSearch}
      />

      <StockPremiumTable
        products={filteredProducts}
        onEdit={openEditProduct}
        onDelete={openDeleteProduct}
      />

      <StockPageKpis
        totalItems={kpis.totalItems}
        lowStock={kpis.lowStock}
        outOfStock={kpis.outOfStock}
        totalStockValue={kpis.totalStockValue}
      />

      {renderDialogs()}
    </PageContainer>
  );
}
