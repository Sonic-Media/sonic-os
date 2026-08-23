"use client";

import {
  StaffAnimatedMoney,
  StaffCard,
  StaffSectionLabel,
} from "@/components/operations/staff/primitives";

interface StaffRevenueCardProps {
  movieRevenue: number;
  accessorySales: number;
}

export function StaffRevenueCard({
  movieRevenue,
  accessorySales,
}: StaffRevenueCardProps) {
  const totalRevenue = movieRevenue + accessorySales;
  const moviePending = movieRevenue <= 0;

  return (
    <StaffCard accent="revenue">
      <StaffSectionLabel>Today&apos;s Revenue</StaffSectionLabel>

      <div className="mt-5">
        <StaffAnimatedMoney
          value={totalRevenue}
          className="text-4xl font-bold text-white sm:text-5xl"
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-5 py-4">
          <StaffSectionLabel>Accessory Revenue</StaffSectionLabel>
          <div className="mt-3">
            <StaffAnimatedMoney
              value={accessorySales}
              className="text-2xl font-bold text-white"
              fromZero={false}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-5 py-4">
          <StaffSectionLabel>Movie Revenue</StaffSectionLabel>
          <div className="mt-3">
            {moviePending ? (
              <span className="text-2xl font-bold text-zinc-500">Pending</span>
            ) : (
              <StaffAnimatedMoney
                value={movieRevenue}
                className="text-2xl font-bold text-white"
                fromZero={false}
              />
            )}
          </div>
        </div>
      </div>
    </StaffCard>
  );
}
