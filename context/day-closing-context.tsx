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
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import {
  computeCashDifference,
  computeDayClosingMetrics,
  computeDayClosingSummary,
  computeExpectedCash,
  resolveCashStatus,
} from "@/lib/day-closing/calculations";
import { canReopenDay } from "@/lib/day-closing/permissions";
import {
  getClosedDayRecord,
  getDayClosings,
  isBranchDayClosed,
  saveDayClosings,
  upsertDayClosingRecord,
} from "@/lib/day-closing/storage";
import { formToEntry, findDraftForBranchDate } from "@/lib/entry-helpers";
import { getTodayISO } from "@/lib/dates";
import { createDefaultExpenses } from "@/lib/expenses";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { pickAuditFields } from "@/lib/audit-log/snapshots";
import { recordStaffAction, resolveStaffByUserId } from "@/lib/staff/audit";
import { getEntries } from "@/lib/storage";
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
  isBranchDayClosed: (branch: Branch, date?: string) => boolean;
  getClosedRecord: (branch: Branch, date?: string) => DayClosingRecord | undefined;
  getBranchStatusInfo: (
    branch: BranchEntity,
    date?: string
  ) => DayClosingStatusInfo;
  closeDay: (input: CloseDayInput) => DayClosingValidationResult;
  reopenDay: (branch: Branch, date?: string) => DayClosingValidationResult;
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
  const { session } = useAuth();
  const { recordStaffPayment } = useStaffPaymentsModule();
  const { upsertEntry } = useEntriesContext();

  useEffect(() => {
    closingsRef.current = closings;
  }, [closings]);

  useEffect(() => {
    queueMicrotask(() => {
      setClosings(getDayClosings());
      setIsLoaded(true);
    });
  }, []);

  const persistClosings = useCallback((next: DayClosingRecord[]) => {
    saveDayClosings(next);
    closingsRef.current = next;
    setClosings(next);
  }, []);

  const isBranchDayClosedFn = useCallback(
    (branch: Branch, date = getTodayISO()) =>
      isBranchDayClosed(branch, date, closingsRef.current),
    []
  );

  const getClosedRecord = useCallback(
    (branch: Branch, date = getTodayISO()) =>
      getClosedDayRecord(branch, date, closingsRef.current),
    []
  );

  const getBranchStatusInfo = useCallback(
    (branch: BranchEntity, date = getTodayISO()): DayClosingStatusInfo => {
      const closed = getClosedDayRecord(branch.code, date, closingsRef.current);

      return {
        branch: branch.code,
        branchName: branch.name,
        date,
        status: closed ? "closed" : "open",
        closedByName: closed?.closedByName,
        closedAt: closed?.closedAt,
      };
    },
    []
  );

  const closeDay = useCallback(
    (input: CloseDayInput): DayClosingValidationResult => {
      const errors: Record<string, string | undefined> = {};

      if (isBranchDayClosed(input.branch, input.date, closingsRef.current)) {
        errors.form = "This branch day is already closed.";
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
        (record) => record.branch === input.branch && record.date === input.date
      );

      const record: DayClosingRecord = {
        id: existing?.id ?? crypto.randomUUID(),
        date: input.date,
        branch: input.branch,
        status: "closed",
        metrics: input.metrics,
        staffPayouts: input.staffPayouts,
        expectedCash: input.expectedCash,
        actualCashCounted: input.actualCashCounted,
        cashDifference: difference,
        cashStatus,
        reconciliationNotes: input.reconciliationNotes?.trim() || undefined,
        summary,
        closedBy: session?.userId,
        closedByName: session?.displayName,
        closedAt: now,
        closingNotes: input.closingNotes?.trim() || undefined,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      persistClosings(upsertDayClosingRecord(record));

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
        recordId: record.id,
        newValues: pickAuditFields(record, [
          "id",
          "date",
          "branch",
          "cashStatus",
          "actualCashCounted",
        ]),
      });

      const draftEntry = findDraftForBranchDate(
        getEntries(),
        input.branch,
        input.date
      );

      upsertEntry(
        formToEntry(
          {
            date: input.date,
            branch: input.branch,
            sales: String(summary.sales),
            expenses: draftEntry?.expenses ?? createDefaultExpenses([]),
            staffId: "",
            notes:
              input.closingNotes?.trim() ||
              draftEntry?.notes ||
              "Closed via Close Day",
            savingsAllocation: String(summary.operatingFund),
          },
          {
            id: draftEntry?.id,
            status: "completed",
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
          }
        )
      );

      return createValidationResult({}, record);
    },
    [recordStaffPayment, persistClosings, session, upsertEntry]
  );

  const reopenDay = useCallback(
    (branch: Branch, date = getTodayISO()): DayClosingValidationResult => {
      if (!session || !canReopenDay(session.role)) {
        return createValidationResult({
          form: "Only Owner or CEO can reopen a closed day.",
        });
      }

      const existing = getClosedDayRecord(branch, date, closingsRef.current);
      if (!existing) {
        return createValidationResult({ form: "This branch day is not closed." });
      }

      const now = new Date().toISOString();
      const nextRecord: DayClosingRecord = {
        ...existing,
        status: "open",
        reopenedBy: session.userId,
        reopenedByName: session.displayName,
        reopenedAt: now,
        updatedAt: now,
      };

      persistClosings(upsertDayClosingRecord(nextRecord));

      recordStaffAction({
        action: AUDIT_ACTIONS.REOPEN_DAY,
        module: "operations",
        branch,
        recordId: nextRecord.id,
        oldValues: pickAuditFields(existing, ["status"]),
        newValues: pickAuditFields(nextRecord, ["status"]),
      });

      return createValidationResult({}, nextRecord);
    },
    [persistClosings, session]
  );

  const value = useMemo(
    () => ({
      closings,
      isLoaded,
      isBranchDayClosed: isBranchDayClosedFn,
      getClosedRecord,
      getBranchStatusInfo,
      closeDay,
      reopenDay,
    }),
    [
      closings,
      isLoaded,
      isBranchDayClosedFn,
      getClosedRecord,
      getBranchStatusInfo,
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
