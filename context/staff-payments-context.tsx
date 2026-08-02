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
import { useExpensesModule } from "@/context/expenses-module-context";
import { useStaff } from "@/context/staff-context";
import { createStaffPaymentApi, fetchStaffPayments } from "@/lib/api/staff-payments";
import {
  loadRemoteOrLocal,
  runRemoteOrLocal,
  shouldUseRemoteDataSource,
} from "@/lib/data-source/context-api";
import { isBranchDayClosed, DAY_CLOSED_EDIT_MESSAGE } from "@/lib/day-closing/storage";
import { isStaffPaymentExpense } from "@/lib/staff-payments/calculations";
import { buildLinkedStaffPaymentRecords } from "@/lib/staff-payments/record";
import {
  getStaffPayments,
  normalizeStaffPaymentList,
  saveStaffPayments,
  sortStaffPaymentsByDate,
} from "@/lib/staff-payments/storage";
import { validateStaffPaymentInput } from "@/lib/staff-payments/validation";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { pickAuditFields } from "@/lib/audit-log/snapshots";
import { recordStaffAction } from "@/lib/staff/audit";
import { resolveCurrentStaffAction } from "@/lib/staff/session";
import type { Branch, Staff } from "@/types";
import type {
  StaffPaymentInput,
  StaffPaymentRecord,
  StaffPaymentValidationResult,
} from "@/types/staff-payment";
import type { ExpenseRecord } from "@/types/expenses-module";

function createValidationResult(
  errors: Record<string, string | undefined>,
  payment?: StaffPaymentRecord
): StaffPaymentValidationResult {
  return {
    success: !Object.values(errors).some(Boolean),
    errors,
    payment,
  };
}

function hasValidationErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}

function migrateLegacyStaffPaymentExpenses(
  expenses: ExpenseRecord[],
  existingPayments: StaffPaymentRecord[],
  getStaffById: (id: string) => Staff | undefined
): StaffPaymentRecord[] {
  const paymentByExpenseId = new Map(
    existingPayments.map((payment) => [payment.expenseId, payment])
  );
  const migrated = [...existingPayments];

  for (const expense of expenses) {
    if (!isStaffPaymentExpense(expense) || expense.staffPaymentId) continue;
    if (paymentByExpenseId.has(expense.id)) continue;

    const paymentId = crypto.randomUUID();
    const linkedStaff = expense.staffId
      ? getStaffById(expense.staffId)
      : undefined;
    const payment: StaffPaymentRecord = {
      id: paymentId,
      staffId: expense.staffId ?? "unknown",
      staffName: expense.staffName ?? linkedStaff?.name ?? "Unknown Staff",
      staffRole: linkedStaff?.role ?? expense.staffRole ?? "sales-attendant",
      amount: Math.abs(expense.amount),
      paymentType: expense.staffPaymentType ?? "daily-wage",
      paymentMethod: expense.paymentMethod,
      branch: expense.branch,
      date: expense.date,
      paidBy: expense.paidBy,
      notes: expense.notes,
      expenseId: expense.id,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };

    migrated.push(payment);
    paymentByExpenseId.set(expense.id, payment);
  }

  return migrated;
}

interface StaffPaymentsContextValue {
  payments: StaffPaymentRecord[];
  isLoaded: boolean;
  getPaymentById: (id: string) => StaffPaymentRecord | undefined;
  getPaymentByExpenseId: (expenseId: string) => StaffPaymentRecord | undefined;
  getPaymentsForBranchDate: (branch: Branch, date: string) => StaffPaymentRecord[];
  recordStaffPayment: (input: StaffPaymentInput) => StaffPaymentValidationResult;
}

const StaffPaymentsContext = createContext<StaffPaymentsContextValue | null>(
  null
);

export function StaffPaymentsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getStaffById } = useStaff();
  const {
    expenses,
    isLoaded: expensesLoaded,
    upsertStaffPaymentExpense,
    linkLegacyStaffPaymentExpenses,
    refreshFromApi: refreshExpensesFromApi,
  } = useExpensesModule();

  const [payments, setPayments] = useState<StaffPaymentRecord[]>(() =>
    getStaffPayments()
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const hasLoaded = useRef(false);
  const paymentsRef = useRef(payments);

  useEffect(() => {
    paymentsRef.current = payments;
  }, [payments]);

  useEffect(() => {
    if (!expensesLoaded || hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        const usingRemote = await shouldUseRemoteDataSource();
        const loaded = await loadRemoteOrLocal({
          remote: fetchStaffPayments,
          local: () => {
            const stored = getStaffPayments();
            return migrateLegacyStaffPaymentExpenses(
              expenses,
              stored,
              getStaffById
            );
          },
        });

        const normalized = sortStaffPaymentsByDate(
          normalizeStaffPaymentList(loaded)
        );

        if (!usingRemote) {
          const stored = getStaffPayments();
          if (normalized.length !== stored.length) {
            saveStaffPayments(normalized);
          }
          linkLegacyStaffPaymentExpenses(normalized);
        }

        paymentsRef.current = normalized;
        setPayments(normalized);
        setIsLoaded(true);
      })();
    });
  }, [
    expenses,
    expensesLoaded,
    getStaffById,
    linkLegacyStaffPaymentExpenses,
  ]);

  const persistPayments = useCallback((next: StaffPaymentRecord[]) => {
    const normalized = sortStaffPaymentsByDate(normalizeStaffPaymentList(next));
    saveStaffPayments(normalized);
    paymentsRef.current = normalized;
    setPayments(normalized);
  }, []);

  const refreshPaymentsFromApi = useCallback(async () => {
    if (!(await shouldUseRemoteDataSource())) {
      return;
    }

    const remote = await fetchStaffPayments();
    const normalized = sortStaffPaymentsByDate(normalizeStaffPaymentList(remote));
    paymentsRef.current = normalized;
    setPayments(normalized);
  }, []);

  const lookup = useMemo(
    () => new Map(payments.map((payment) => [payment.id, payment])),
    [payments]
  );

  const expenseLookup = useMemo(
    () => new Map(payments.map((payment) => [payment.expenseId, payment])),
    [payments]
  );

  const getPaymentById = useCallback(
    (id: string) => lookup.get(id),
    [lookup]
  );

  const getPaymentByExpenseId = useCallback(
    (expenseId: string) => expenseLookup.get(expenseId),
    [expenseLookup]
  );

  const getPaymentsForBranchDate = useCallback(
    (branch: Branch, date: string) =>
      paymentsRef.current.filter(
        (payment) => payment.branch === branch && payment.date === date
      ),
    []
  );

  const recordStaffPayment = useCallback(
    (input: StaffPaymentInput): StaffPaymentValidationResult => {
      const errors = validateStaffPaymentInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const staff = getStaffById(input.staffId);
      if (!staff) {
        return createValidationResult({ staffId: "Staff member not found." });
      }

      if (isBranchDayClosed(staff.branch, input.date)) {
        return createValidationResult({ form: DAY_CLOSED_EDIT_MESSAGE });
      }

      const { payment, expense } = buildLinkedStaffPaymentRecords({
        staff,
        paymentInput: input,
      });

      void (async () => {
        await runRemoteOrLocal({
          remote: async () => {
            const payer = resolveCurrentStaffAction(staff.branch);
            const created = await createStaffPaymentApi({
              ...input,
              paidBy: payer,
            });
            await refreshPaymentsFromApi();
            await refreshExpensesFromApi();

            recordStaffAction({
              staffId: payer?.staffId ?? staff.id,
              staffName: payer?.staffName ?? staff.name,
              role: payer?.role ?? staff.role,
              branch: staff.branch,
              action: AUDIT_ACTIONS.STAFF_PAYMENT,
              module: "staff",
              recordId: created.id,
              newValues: pickAuditFields(created, [
                "id",
                "staffName",
                "amount",
                "paymentType",
                "branch",
                "date",
              ]),
            });
          },
          local: () => {
            const expenseResult = upsertStaffPaymentExpense(expense);
            if (!expenseResult.success) {
              return;
            }

            persistPayments([payment, ...paymentsRef.current]);

            const payer = payment.paidBy;
            recordStaffAction({
              staffId: payer?.staffId ?? staff.id,
              staffName: payer?.staffName ?? staff.name,
              role: payer?.role ?? staff.role,
              branch: staff.branch,
              action: AUDIT_ACTIONS.STAFF_PAYMENT,
              module: "staff",
              recordId: payment.id,
              newValues: pickAuditFields(payment, [
                "id",
                "staffName",
                "amount",
                "paymentType",
                "branch",
                "date",
              ]),
            });
          },
        });
      })();

      return createValidationResult({}, payment);
    },
    [
      getStaffById,
      persistPayments,
      refreshExpensesFromApi,
      refreshPaymentsFromApi,
      upsertStaffPaymentExpense,
    ]
  );

  const value = useMemo(
    () => ({
      payments,
      isLoaded: isLoaded && expensesLoaded,
      getPaymentById,
      getPaymentByExpenseId,
      getPaymentsForBranchDate,
      recordStaffPayment,
    }),
    [
      payments,
      isLoaded,
      expensesLoaded,
      getPaymentById,
      getPaymentByExpenseId,
      getPaymentsForBranchDate,
      recordStaffPayment,
    ]
  );

  return (
    <StaffPaymentsContext.Provider value={value}>
      {children}
    </StaffPaymentsContext.Provider>
  );
}

export function useStaffPaymentsModule() {
  const context = useContext(StaffPaymentsContext);
  if (!context) {
    throw new Error(
      "useStaffPaymentsModule must be used within a StaffPaymentsProvider"
    );
  }
  return context;
}
