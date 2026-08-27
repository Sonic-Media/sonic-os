"use client";

import { useState } from "react";
import { NewSaleForm } from "@/components/sales/new-sale-form";
import { StockDialog } from "@/components/stock/stock-dialog";
import {
  StaffCard,
  StaffMetricTile,
  StaffPremiumButton,
  StaffSectionLabel,
  StaffSuccessFlash,
} from "@/components/operations/staff/primitives";
import { useToast } from "@/context/toast-context";
import { getTodayISO } from "@/lib/dates";

interface StaffTodayActivityCardProps {
  moviesSold: number;
  accessoriesSold: number;
  date: string;
  onSaleComplete?: () => void;
}

export function StaffTodayActivityCard({
  moviesSold,
  accessoriesSold,
  date,
  onSaleComplete,
}: StaffTodayActivityCardProps) {
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const { success: toastSuccess } = useToast();

  const totalTransactions = moviesSold + accessoriesSold;
  const isToday = date === getTodayISO();

  function handleSaleSuccess() {
    setRefreshKey((value) => value + 1);
    setShowSuccess(true);
    toastSuccess("Sale Recorded");
    window.setTimeout(() => setShowSuccess(false), 1200);
    setShowSaleModal(false);
    onSaleComplete?.();
  }

  return (
    <>
      <StaffCard accent="default">
        <div className="flex items-start justify-between gap-4">
          <StaffSectionLabel>Today&apos;s Activity</StaffSectionLabel>
          <StaffSuccessFlash show={showSuccess} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StaffMetricTile label="Movies Sold" value={moviesSold} />
          <StaffMetricTile label="Accessories Sold" value={accessoriesSold} />
          <StaffMetricTile
            label="Total Transactions"
            value={totalTransactions}
          />
        </div>

        {isToday ? (
          <div className="mt-6">
            <StaffPremiumButton
              type="button"
              onClick={() => setShowSaleModal(true)}
              className="bg-white/90 text-zinc-950 hover:bg-white"
            >
              + Record Accessory Sale
            </StaffPremiumButton>
          </div>
        ) : null}
      </StaffCard>

      {showSaleModal ? (
        <StockDialog
          title="Record Accessory Sale"
          description="Add a new accessory sale for today."
          onClose={() => setShowSaleModal(false)}
        >
          <NewSaleForm key={refreshKey} inline onSuccess={handleSaleSuccess} />
        </StockDialog>
      ) : null}
    </>
  );
}
