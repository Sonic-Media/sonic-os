"use client";

import { StockProductsFilters } from "@/components/stock/stock-products-filters";
import { StockProductsTable } from "@/components/stock/stock-products-table";
import { StockSubnav } from "@/components/stock/stock-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { useBranches } from "@/context/branches-context";
import { useStock } from "@/context/stock-context";
import { useStockProducts } from "@/hooks/use-stock-products";
import { useStockDialogs } from "@/hooks/use-stock-dialogs";

export default function StockProductsPage() {
  const { movements } = useStock();
  const { activeBranches } = useBranches();
  const { criteria, products, updateCriteria } = useStockProducts();
  const {
    openAddProduct,
    openEditProduct,
    openDeleteProduct,
    renderDialogs,
  } = useStockDialogs();

  return (
    <PageContainer>
      <PageHeader
        title="Products"
        subtitle="Physical product catalog"
      />

      <div className="mb-6 flex justify-end">
        <Button type="button" onClick={openAddProduct}>
          Add Item
        </Button>
      </div>

      <StockSubnav />

      <div className="lg:grid lg:grid-cols-[minmax(280px,320px)_1fr] lg:gap-8 lg:items-start">
        <StockProductsFilters
          criteria={criteria}
          onCriteriaChange={updateCriteria}
          className="lg:sticky lg:top-8 lg:mb-0"
        />

        <StockProductsTable
          products={products}
          movements={movements}
          branches={activeBranches}
          onEdit={openEditProduct}
          onDelete={openDeleteProduct}
        />
      </div>

      {renderDialogs()}
    </PageContainer>
  );
}
