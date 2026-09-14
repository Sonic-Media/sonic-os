"use client";

import { useBranchState } from "@/hooks/use-branch-state";
import {
  AnimatedMoney,
  OwnerCard,
  OwnerKpiIcon,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

function KpiMoneyCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: "blue" | "purple" | "green";
  icon: React.ReactNode;
}) {
  return (
    <OwnerCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>
          <AnimatedMoney
            value={value}
            className="mt-3 block text-2xl font-semibold text-white sm:text-[1.65rem]"
          />
        </div>
        <OwnerKpiIcon accent={accent}>{icon}</OwnerKpiIcon>
      </div>
    </OwnerCard>
  );
}

function ShopStatusIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72M6.75 18h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z" />
    </svg>
  );
}

function StaffIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function BusinessPulseKpis() {
  const branchState = useBranchState();
  const totalRevenue = branchState.movieRevenue + branchState.accessoryRevenue;

  const statusLabel =
    branchState.status === "open"
      ? "Open"
      : branchState.status === "closed"
        ? "Closed"
        : "Waiting";

  const staffLabel =
    branchState.activeStaffCount === 0
      ? "None on shift"
      : `${branchState.activeStaffCount} on shift`;

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <OwnerCard className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Shop Status
            </p>
            <p
              className={cn(
                "mt-3 text-2xl font-semibold sm:text-[1.65rem]",
                branchState.status === "open"
                  ? "text-emerald-400"
                  : branchState.status === "waiting"
                    ? "text-orange-400"
                    : "text-zinc-400"
              )}
            >
              {statusLabel}
            </p>
          </div>
          <OwnerKpiIcon accent="green">
            <ShopStatusIcon />
          </OwnerKpiIcon>
        </div>
      </OwnerCard>

      <OwnerCard className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Staff
            </p>
            <p className="mt-3 text-2xl font-semibold text-white sm:text-[1.65rem]">
              {staffLabel}
            </p>
            {branchState.activeStaffCount > 0 ? (
              <p className="mt-1 truncate text-xs text-zinc-500">
                {branchState.activeStaff.map((s) => s.staffName).join(", ")}
              </p>
            ) : null}
          </div>
          <OwnerKpiIcon accent="green">
            <StaffIcon />
          </OwnerKpiIcon>
        </div>
      </OwnerCard>

      <KpiMoneyCard
        label="Movie Revenue"
        value={branchState.movieRevenue}
        accent="blue"
        icon={<RevenueIcon />}
      />
      <KpiMoneyCard
        label="Accessory Revenue"
        value={branchState.accessoryRevenue}
        accent="purple"
        icon={<RevenueIcon />}
      />
      <KpiMoneyCard
        label="Total Revenue"
        value={totalRevenue}
        accent="green"
        icon={<RevenueIcon />}
      />
    </section>
  );
}
