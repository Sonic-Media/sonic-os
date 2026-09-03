"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBranches } from "@/context/branches-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useStock } from "@/context/stock-context";
import { listBackupsApi, type BackupRecordSummary } from "@/lib/api/backup";
import {
  generateBusinessIntelligenceFeed,
} from "@/lib/business-intelligence";
import type { BIFeed } from "@/lib/business-intelligence/types";
import type { BIAnalysisContext, BackupSummary } from "@/lib/business-intelligence/context";
import {
  getMonthStartISO,
  getWeekStartISO,
  getYesterdayISO,
  shiftDateISO,
} from "@/lib/business-intelligence/helpers";
import { getTodayISO } from "@/lib/dates";

function mapBackups(records: BackupRecordSummary[]): BackupSummary[] {
  return records.map((record) => ({
    createdAt: record.createdAt,
    status: record.status,
  }));
}

function buildDataSignature(context: Omit<BIAnalysisContext, "nowMs">): string {
  return [
    context.today,
    context.sales.length,
    context.sales[0]?.createdAt ?? "",
    context.expenses.length,
    context.expenses[0]?.updatedAt ?? context.expenses[0]?.createdAt ?? "",
    context.entries.length,
    context.purchases.length,
    context.payments.length,
    context.closings.length,
    context.movements.length,
    context.products.length,
    context.staff.length,
    context.branches.length,
    context.backups.length,
    context.backups[0]?.createdAt ?? "",
  ].join("|");
}

export function useBusinessIntelligence(): {
  feed: BIFeed;
  isLoaded: boolean;
} {
  const today = getTodayISO();
  const { branches, isLoaded: branchesLoaded } = useBranches();
  const { settings, isLoaded: settingsLoaded } = useSettings();
  const { sales, isLoaded: salesLoaded } = useSales();
  const { expenses, isLoaded: expensesLoaded } = useExpensesModule();
  const { entries, isLoaded: entriesLoaded } = useEntriesContext();
  const { purchases, isLoaded: purchasingLoaded } = usePurchasing();
  const { products, movements, isLoaded: stockLoaded } = useStock();
  const { staff, isLoaded: staffLoaded } = useStaff();
  const { payments, isLoaded: paymentsLoaded } = useStaffPaymentsModule();
  const { closings, isLoaded: closingsLoaded } = useDayClosing();

  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [backupsLoaded, setBackupsLoaded] = useState(false);
  const lastSignature = useRef<string>("");
  const cachedFeed = useRef<BIFeed | null>(null);

  useEffect(() => {
    let cancelled = false;

    void listBackupsApi()
      .then((records) => {
        if (cancelled) return;
        setBackups(mapBackups(records));
      })
      .catch(() => {
        if (cancelled) return;
        setBackups([]);
      })
      .finally(() => {
        if (!cancelled) {
          setBackupsLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    sales.length,
    expenses.length,
    entries.length,
    payments.length,
    closings.length,
  ]);

  const contextBase = useMemo(
    (): Omit<BIAnalysisContext, "nowMs"> => ({
      today,
      yesterday: getYesterdayISO(today),
      weekStart: getWeekStartISO(today),
      lastWeekStart: shiftDateISO(getWeekStartISO(today), -7),
      monthStart: getMonthStartISO(today),
      lastMonthStart: shiftDateISO(getMonthStartISO(today), -1).slice(0, 7) + "-01",
      branches,
      branchNames: settings.branchNames,
      sales,
      purchases,
      expenses,
      entries,
      products,
      movements,
      staff,
      payments,
      closings,
      backups,
    }),
    [
      today,
      branches,
      settings.branchNames,
      sales,
      purchases,
      expenses,
      entries,
      products,
      movements,
      staff,
      payments,
      closings,
      backups,
    ]
  );

  const isLoaded =
    branchesLoaded &&
    settingsLoaded &&
    salesLoaded &&
    expensesLoaded &&
    entriesLoaded &&
    purchasingLoaded &&
    stockLoaded &&
    staffLoaded &&
    paymentsLoaded &&
    closingsLoaded &&
    backupsLoaded;

  const feed = useMemo(() => {
    if (!isLoaded) {
      return cachedFeed.current ?? { insights: [], generatedAt: new Date().toISOString() };
    }

    const signature = buildDataSignature(contextBase);
    if (signature === lastSignature.current && cachedFeed.current) {
      return cachedFeed.current;
    }

    const nextFeed = generateBusinessIntelligenceFeed({
      ...contextBase,
      nowMs: Date.now(),
    });

    lastSignature.current = signature;
    cachedFeed.current = nextFeed;
    return nextFeed;
  }, [contextBase, isLoaded]);

  return { feed, isLoaded };
}
