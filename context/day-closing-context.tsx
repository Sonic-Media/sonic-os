"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/context/auth-context";
import { useEntriesContext } from "@/context/entries-context";
import { useSettings } from "@/context/settings-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useStaff } from "@/context/staff-context";
import {
  computeCashDifference,
  computeDayClosingMetrics,
  computeDayClosingSummary,
  computeExpectedCash,
  resolveCashStatus,
} from "@/lib/day-closing/calculations";
import { canReopenDay } from "@/lib/day-closing/permissions";
import { closeDayApi, fetchDayClosings, openDayApi, reopenDayApi } from "@/lib/api/day-closings";
import {
  getDataSourceErrorMessage,
  loadFromApi,
  runOnApi,
} from "@/lib/data-source/context-api";
import {
  getClosedDayRecord as findClosedDayRecord,
  getOpenDayRecord as findOpenDayRecord,
  isBranchDayClosed as checkBranchDayClosed,
  isBranchDayOpened as checkBranchDayOpened,
  needsShopOpening as checkNeedsShopOpening,
  setDayClosingsCache,
  upsertDayClosingRecord,
} from "@/lib/day-closing/storage";
import { buildClosedDayDailyOperationEntry } from "@/lib/day-closing/entry-sync";
import { findDraftForBranchDate } from "@/lib/entry-helpers";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { getTodayISO } from "@/lib/dates";
import { toStaffFacingError } from "@/lib/ux/staff-messages";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { pickAuditFields } from "@/lib/audit-log/snapshots";
import { recordStaffAction, resolveStaffByUserId } from "@/lib/staff/audit";
import { resolveStaffDisplayName } from "@/lib/ux/user-display";
import type { Branch } from "@/types";
import type {
  DayClosingRecord,
  DayClosingStaffPayout,
  DayClosingStatusInfo,
} from "@/types/day-closing";
import type { BranchEntity } from "@/types/branch";

export interface CloseDayInput {
  branch: Branch;
  date: string;
  metrics: DayClosingRecord["metrics"];
  staffPayouts: DayClosingStaffPayout[];
  expectedCash: number;
  actualCashCounted: number;
  reconciliationNotes?: string;
  closingNotes?: string;
}

export interface DayClosingValidationResult {
  success: boolean;
  errors: Record<string, string | undefined>;
  record?: DayClosingRecord;
}

interface DayClosingContextValue {
  closings: DayClosingRecord[];
  isLoaded: boolean;
  refreshClosings: () => Promise<void>;
  isBranchDayClosed: (branch: Branch, date?: string) => boolean;
  isBranchDayOpened: (branch: Branch, date?: string) => boolean;
  needsShopOpening: (branch: Branch, date?: string) => boolean;
  getClosedRecord: (branch: Branch, date?: string) => DayClosingRecord | undefined;
  getOpenRecord: (branch: Branch, date?: string) => DayClosingRecord | undefined;
  getBranchStatusInfo: (
    branch: BranchEntity,
    date?: string
  ) => DayClosingStatusInfo;
  openDay: (
    branch: Branch,
    date?: string
  ) => Promise<DayClosingValidationResult>;
  closeDay: (input: CloseDayInput) => Promise<DayClosingValidationResult>;
  reopenDay: (
    branch: Branch,
    date?: string
  ) => Promise<DayClosingValidationResult>;
}

const DayClosingContext = createContext<DayClosingContextValue | null>(null);

function createValidationResult(
  errors: Record<string, string | undefined>,
  record?: DayClosingRecord
): DayClosingValidationResult {
  return {
    success: !Object.values(errors).some(Boolean),
    errors,
    record,
  };
}

export function DayClosingProvider({ children }: { children: React.ReactNode }) {
  const [closings, setClosings] = useState<DayClosingRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const closingsRef = useRef(closings);
  const wasAuthenticated = useRef(false);
  const lastSessionUserId = useRef<string | null>(null);
  const { session, isAuthenticated, isLoaded: authLoaded } = useAuth();
  const { settings } = useSettings();
  const { recordStaffPayment } = useStaffPaymentsModule();
  const { upsertEntry, entries, refreshEntries } = useEntriesContext();
  const { staff } = useStaff();

  useEffect(() => {
    closingsRef.current = closings;
  }, [closings]);

  const refreshClosingsFromApi = useCallback(async () => {
    const remoteClosings = await fetchDayClosings();
    closingsRef.current = remoteClosings;
    setDayClosingsCache(remoteClosings);
    setClosings(remoteClosings);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    if (!isAuthenticated) {
      closingsRef.current = [];
      setDayClosingsCache([]);
      setClosings([]);
      setIsLoaded(true);
      wasAuthenticated.current = false;
      lastSessionUserId.current = null;
      return;
    }

    const sessionUserId = session?.userId ?? null;
    const shouldRefresh =
      !wasAuthenticated.current ||
      lastSessionUserId.current !== sessionUserId;

    wasAuthenticated.current = true;
    lastSessionUserId.current = sessionUserId;

    if (!shouldRefresh) {
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);

    queueMicrotask(() => {
      void (async () => {
        try {
          await loadFromApi(() => refreshClosingsFromApi());
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        } finally {
          setIsLoaded(true);
        }
      })();
    });
  }, [authLoaded, isAuthenticated, refreshClosingsFromApi, session?.userId]);

  const persistClosings = useCallback((next: DayClosingRecord[]) => {
    closingsRef.current = next;
    setDayClosingsCache(next);
    setClosings(next);
  }, []);

  const isBranchDayClosedFn = useCallback(
    (branch: Branch, date = getTodayISO()) =>
      checkBranchDayClosed(branch, date, closingsRef.current),
    []
  );

  const isBranchDayOpenedFn = useCallback(
    (branch: Branch, date = getTodayISO()) =>
      checkBranchDayOpened(branch, date, closingsRef.current),
    []
  );

  const needsShopOpeningFn = useCallback(
    (branch: Branch, date = getTodayISO()) =>
      checkNeedsShopOpening(branch, date, closingsRef.current),
    []
  );

  const getClosedRecord = useCallback(
    (branch: Branch, date = getTodayISO()) =>
      findClosedDayRecord(branch, date, closingsRef.current),
    []
  );

  const getOpenRecord = useCallback(
    (branch: Branch, date = getTodayISO()) =>
      findOpenDayRecord(branch, date, closingsRef.current),
    []
  );

  const getBranchStatusInfo = useCallback(
    (branch: BranchEntity, date = getTodayISO()): DayClosingStatusInfo => {
      const closed = findClosedDayRecord(branch.code, date, closingsRef.current);
      const open = findOpenDayRecord(branch.code, date, closingsRef.current);
      const isOpen = checkBranchDayOpened(branch.code, date, closingsRef.current);
      const status = closed ? "closed" : isOpen ? "open" : "waiting";

      return {
        branch: branch.code,
        branchName: branch.name,
        date,
        status,
        openedByName: open?.openedByName,
        openedAt: open?.openedAt ?? open?.reopenedAt,
        closedByName: closed?.closedByName,
        closedAt: closed?.closedAt,
      };
    },
    []
  );

  const openDay = useCallback(
    async (
      branch: Branch,
      date = getTodayISO()
    ): Promise<DayClosingValidationResult> => {
      if (!session) {
        return createValidationResult({
          form: "You must be signed in to start today's shift.",
        });
      }

      if (checkBranchDayClosed(branch, date, closingsRef.current)) {
        return createValidationResult({
          form: "Today's shift has already been completed.",
        });
      }

      if (checkBranchDayOpened(branch, date, closingsRef.current)) {
        return createValidationResult({
          form: "Today's shift has already been started.",
        });
      }

      try {
        const actorName = resolveStaffDisplayName(session, staff);
        const saved = await runOnApi(() =>
          openDayApi({
            branch,
            date,
            openedBy: session.userId,
            openedByName: actorName,
          })
        );

        persistClosings(
          upsertDayClosingRecord(saved, closingsRef.current)
        );

        const linkedStaff = resolveStaffByUserId(session.userId);

        recordStaffAction({
          staffId: linkedStaff?.id,
          staffName: linkedStaff?.name ?? session.displayName,
          role: linkedStaff?.role,
          branch,
          action: AUDIT_ACTIONS.OPEN_DAY,
          module: "operations",
          recordId: saved.id,
          newValues: pickAuditFields(saved, [
            "id",
            "date",
            "branch",
            "openedAt",
          ]),
        });

        await refreshEntries();

        return createValidationResult({}, saved);
      } catch (error) {
        return createValidationResult({
          form: toStaffFacingError(getDataSourceErrorMessage(error), {
            ownerName: settings.ownerName,
            context: "start-shift",
          }),
        });
      }
    },
    [persistClosings, refreshEntries, session, settings.ownerName, staff]
  );

  const closeDay = useCallback(
    async (input: CloseDayInput): Promise<DayClosingValidationResult> => {
      const errors: Record<string, string | undefined> = {};

      if (checkBranchDayClosed(input.branch, input.date, closingsRef.current)) {
        errors.form = "Today's shift has already been completed.";
      }

      if (!checkBranchDayOpened(input.branch, input.date, closingsRef.current)) {
        errors.form = "Start today's shift before closing the day.";
      }

      if (!session) {
        errors.form = "You must be signed in to close the day.";
      }

      const difference = computeCashDifference(
        input.expectedCash,
        input.actualCashCounted
      );
      const cashStatus = resolveCashStatus(difference);

      if (cashStatus !== "balanced" && !input.reconciliationNotes?.trim()) {
        errors.reconciliationNotes =
          "Add a note whenever cash is short or over.";
      }

      const selectedPayouts = input.staffPayouts.filter(
        (payout) => payout.selected && payout.amount > 0
      );

      for (const payout of selectedPayouts) {
        if (payout.paidToday) {
          errors.form = `${payout.staffName} has already been paid today.`;
          break;
        }
      }

      if (Object.values(errors).some(Boolean)) {
        return createValidationResult(errors);
      }

      for (const payout of selectedPayouts) {
        const paymentResult = recordStaffPayment({
          staffId: payout.staffId,
          amount: payout.amount,
          date: input.date,
          paymentType: "daily-wage",
          paymentMethod: "cash",
          notes: payout.notes?.trim() || "End of day payout",
        });

        if (!paymentResult.success) {
          return createValidationResult({
            form:
              paymentResult.errors.form ??
              `Unable to pay ${payout.staffName}.`,
          });
        }
      }

      const summary = computeDayClosingSummary(
        input.metrics,
        input.staffPayouts,
        input.actualCashCounted
      );
      const now = new Date().toISOString();
      const existing = closingsRef.current.find(
        (record) =>
          branchCodesReferToSameInventory(record.branch, input.branch) &&
          record.date === input.date
      );

      try {
        const saved = await runOnApi(() =>
          closeDayApi({
            date: input.date,
            branch: input.branch,
            metrics: input.metrics,
            staffPayouts: input.staffPayouts,
            expectedCash: input.expectedCash,
            actualCashCounted: input.actualCashCounted,
            cashDifference: difference,
            cashStatus,
            reconciliationNotes: input.reconciliationNotes,
            closingNotes: input.closingNotes,
            summary,
            closedBy: session?.userId,
            closedByName: session?.displayName,
          })
        );

        persistClosings(
          upsertDayClosingRecord(saved, closingsRef.current)
        );

        const linkedStaff = session?.userId
          ? resolveStaffByUserId(session.userId)
          : undefined;

        recordStaffAction({
          staffId: linkedStaff?.id,
          staffName: linkedStaff?.name ?? session?.displayName,
          role: linkedStaff?.role,
          branch: input.branch,
          action: AUDIT_ACTIONS.CLOSE_DAY,
          module: "operations",
          recordId: saved.id,
          newValues: pickAuditFields(saved, [
            "id",
            "date",
            "branch",
            "cashStatus",
            "actualCashCounted",
          ]),
        });

        const draftEntry = findDraftForBranchDate(
          entries,
          input.branch,
          input.date
        );

        await upsertEntry(
          buildClosedDayDailyOperationEntry({
            branch: input.branch,
            date: input.date,
            summary,
            closingNotes: input.closingNotes,
            existing: draftEntry,
            createdBy: linkedStaff
              ? {
                  staffId: linkedStaff.id,
                  staffName: linkedStaff.name,
                  role: linkedStaff.role,
                  branch: input.branch,
                  timestamp: now,
                }
              : undefined,
          })
        );

        await refreshEntries();

        return createValidationResult({}, saved);
      } catch (error) {
        return createValidationResult({
          form: toStaffFacingError(getDataSourceErrorMessage(error), {
            ownerName: settings.ownerName,
            context: "close-day",
          }),
        });
      }
    },
    [recordStaffPayment, persistClosings, session, upsertEntry, entries, refreshEntries, settings.ownerName]
  );

  const reopenDay = useCallback(
    async (
      branch: Branch,
      date = getTodayISO()
    ): Promise<DayClosingValidationResult> => {
      if (!session || !canReopenDay(session.role)) {
        return createValidationResult({
          form: "Only Owner or Branch Manager can reopen a closed day.",
        });
      }

      const existing = findClosedDayRecord(branch, date, closingsRef.current);
      if (!existing) {
        return createValidationResult({ form: "This branch day is not closed." });
      }

      try {
        const saved = await runOnApi(() =>
          reopenDayApi({
            branch,
            date,
            reopenedBy: session.userId,
            reopenedByName: session.displayName,
          })
        );

        persistClosings(
          upsertDayClosingRecord(saved, closingsRef.current)
        );

        recordStaffAction({
          action: AUDIT_ACTIONS.REOPEN_DAY,
          module: "operations",
          branch,
          recordId: saved.id,
          oldValues: pickAuditFields(existing, ["status"]),
          newValues: pickAuditFields(saved, ["status"]),
        });

        return createValidationResult({}, saved);
      } catch (error) {
        return createValidationResult({
          form: toStaffFacingError(getDataSourceErrorMessage(error), {
            ownerName: settings.ownerName,
            context: "general",
          }),
        });
      }
    },
    [persistClosings, session, settings.ownerName]
  );

  const value = useMemo(
    () => ({
      closings,
      isLoaded,
      refreshClosings: refreshClosingsFromApi,
      isBranchDayClosed: isBranchDayClosedFn,
      isBranchDayOpened: isBranchDayOpenedFn,
      needsShopOpening: needsShopOpeningFn,
      getClosedRecord,
      getOpenRecord,
      getBranchStatusInfo,
      openDay,
      closeDay,
      reopenDay,
    }),
    [
      closings,
      isLoaded,
      refreshClosingsFromApi,
      isBranchDayClosedFn,
      isBranchDayOpenedFn,
      needsShopOpeningFn,
      getClosedRecord,
      getOpenRecord,
      getBranchStatusInfo,
      openDay,
      closeDay,
      reopenDay,
    ]
  );

  return (
    <DayClosingContext.Provider value={value}>{children}</DayClosingContext.Provider>
  );
}

export function useDayClosing() {
  const context = useContext(DayClosingContext);
  if (!context) {
    throw new Error("useDayClosing must be used within a DayClosingProvider");
  }
  return context;
}
