"use client";

import { StockMovementTable } from "@/components/stock/stock-movement-table";
import { StockSubnav } from "@/components/stock/stock-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { useStockMovement } from "@/hooks/use-stock-movement";
import { useStockDialogs } from "@/hooks/use-stock-dialogs";

export default function StockMovementPage() {
  const { movements } = useStockMovement();
  const { openStockIn, openStockOut, renderDialogs } = useStockDialogs();

  return (
    <PageContainer>
      <PageHeader
        title="Stock Movement"
        subtitle="Track stock in and stock out"
      />

      <div className="mb-6 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => openStockIn()}>
          Stock In
        </Button>
        <Button type="button" onClick={() => openStockOut()}>
          Stock Out
        </Button>
      </div>

      <StockSubnav />

      <StockMovementTable movements={movements} />

      {renderDialogs()}
    </PageContainer>
  );
}
