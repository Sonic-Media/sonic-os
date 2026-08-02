"use client";

import { useParams, useRouter } from "next/navigation";
import { StockProductActivityTimeline } from "@/components/stock/stock-product-activity-timeline";
import { StockProductBreadcrumbs } from "@/components/stock/stock-product-breadcrumbs";
import { StockProductChartPlaceholders } from "@/components/stock/stock-product-chart-placeholders";
import { StockProductDetailQuickActions } from "@/components/stock/stock-product-detail-quick-actions";
import { StockProductMovementHistory } from "@/components/stock/stock-product-movement-history";
import { StockProductNotFound } from "@/components/stock/stock-product-not-found";
import { StockProductStatistics } from "@/components/stock/stock-product-statistics";
import { StockProductStockHealth } from "@/components/stock/stock-product-stock-health";
import { StockProductSummary } from "@/components/stock/stock-product-summary";
import { StockSubnav } from "@/components/stock/stock-subnav";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useStockProduct } from "@/hooks/use-stock-product";
import { useStockDialogs } from "@/hooks/use-stock-dialogs";
import { getStockCategoryLabel } from "@/lib/stock/constants";

export default function StockProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const {
    product,
    movements,
    metrics,
    timeline,
    lastStockIn,
    lastStockOut,
    isLoaded,
  } = useStockProduct(productId);

  const {
    openEditProduct,
    openDeleteProduct,
    openStockIn,
    openStockOut,
    renderDialogs,
  } = useStockDialogs({
    onProductDeleted: () => router.push("/stock/products"),
  });

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (!product || !metrics) {
    return <StockProductNotFound />;
  }

  return (
    <PageContainer>
      <StockProductBreadcrumbs productName={product.name} />

      <PageHeader
        title="Item Details"
        subtitle={`${product.name} · ${getStockCategoryLabel(product.category)}`}
      />

      <StockSubnav />

      <div className="space-y-8">
        <StockProductSummary product={product} />

        <StockProductDetailQuickActions
          onEdit={() => openEditProduct(product)}
          onStockIn={() => openStockIn(product.id)}
          onStockOut={() => openStockOut(product.id)}
          onDelete={() => openDeleteProduct(product)}
        />

        <StockProductStockHealth
          product={product}
          lastStockIn={lastStockIn}
          lastStockOut={lastStockOut}
        />

        <StockProductStatistics metrics={metrics} />

        <StockProductChartPlaceholders />

        <StockProductMovementHistory movements={movements} />

        <StockProductActivityTimeline events={timeline} />
      </div>

      {renderDialogs()}
    </PageContainer>
  );
}
