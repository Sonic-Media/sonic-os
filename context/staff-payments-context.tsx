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
import { useStaff } from "@/context/staff-context";
import {
  createStaffPaymentApi,
  fetchStaffPayments,
} from "@/lib/api/staff-payments";
import {
  getDataSourceErrorMessage,
  loadFromApi,
  runOnApi,
} from "@/lib/data-source/context-api";
import { getTodayISO } from "@/lib/dates";
import {
  DAY_CLOSED_EDIT_MESSAGE,
  isBranchDayClosed,
  isBranchDayOpened,
  SHOP_NOT_OPENED_MESSAGE,
} from "@/lib/day-closing/storage";
import {
  normalizeStaffPaymentList,
  sortStaffPaymentsByDate,
} from "@/lib/staff-payments/storage";
import { validateStaffPaymentInput } from "@/lib/staff-payments/validation";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { pickAuditFields } from "@/lib/audit-log/snapshots";
import { recordStaffAction } from "@/lib/staff/audit";
import { resolveCurrentStaffAction } from "@/lib/staff/session";
import type { Branch } from "@/types";
import type {
  StaffPaymentInput,
  StaffPaymentRecord,
  StaffPaymentValidationResult,
} from "@/types/staff-payment";

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

interface StaffPaymentsContextValue {
  payments: StaffPaymentRecord[];
  isLoaded: boolean;
  loadError: string | null;
  refreshPayments: () => Promise<void>;
  getPaymentById: (id: string) => StaffPaymentRecord | undefined;
  getPaymentByExpenseId: (expenseId: string) => StaffPaymentRecord | undefined;
  getPaymentsForBranchDate: (branch: Branch, date: string) => StaffPaymentRecord[];
  recordStaffPayment: (input: StaffPaymentInput) => StaffPaymentValidationResult;
  recordStaffPaymentAsync: (
    input: StaffPaymentInput
  ) => Promise<StaffPaymentValidationResult>;
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

  const [payments, setPayments] = useState<StaffPaymentRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const paymentsRef = useRef(payments);

  useEffect(() => {
    paymentsRef.current = payments;
  }, [payments]);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        try {
          const loaded = await loadFromApi(fetchStaffPayments);
          const normalized = sortStaffPaymentsByDate(
            normalizeStaffPaymentList(loaded)
          );
          paymentsRef.current = normalized;
          setPayments(normalized);
          setLoadError(null);
        } catch (error) {
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          setIsLoaded(true);
        }
      })();
    });
  }, []);

  const refreshPaymentsFromApi = useCallback(async () => {
    const remote = await fetchStaffPayments();
    const normalized = sortStaffPaymentsByDate(
      normalizeStaffPaymentList(remote)
    );
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

  const recordStaffPaymentAsync = useCallback(
    async (input: StaffPaymentInput): Promise<StaffPaymentValidationResult> => {
      const errors = validateStaffPaymentInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const staff = getStaffById(input.staffId);
      if (!staff) {
        return createValidationResult({ staffId: "Staff member not found." });
      }

      const isHistorical = input.date !== getTodayISO();

      if (!isHistorical) {
        if (isBranchDayClosed(staff.branch, input.date)) {
          return createValidationResult({ form: DAY_CLOSED_EDIT_MESSAGE });
        }
        if (!isBranchDayOpened(staff.branch, input.date)) {
          return createValidationResult({ form: SHOP_NOT_OPENED_MESSAGE });
        }
      }

      try {
        const payment = await runOnApi(async () => {
          const payer = resolveCurrentStaffAction(staff.branch);
          const created = await createStaffPaymentApi({
            ...input,
            branch: input.branch ?? staff.branch,
            paidBy: payer,
          });
          await refreshPaymentsFromApi();

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

          return created;
        });

        return createValidationResult({}, payment);
      } catch (error) {
        return createValidationResult({
          form: getDataSourceErrorMessage(error),
        });
      }
    },
    [getStaffById, refreshPaymentsFromApi]
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

      const isHistorical = input.date !== getTodayISO();

      if (!isHistorical) {
        if (isBranchDayClosed(staff.branch, input.date)) {
          return createValidationResult({ form: DAY_CLOSED_EDIT_MESSAGE });
        }
        if (!isBranchDayOpened(staff.branch, input.date)) {
          return createValidationResult({ form: SHOP_NOT_OPENED_MESSAGE });
        }
      }

      void (async () => {
        try {
          await runOnApi(async () => {
            const payer = resolveCurrentStaffAction(staff.branch);
            const created = await createStaffPaymentApi({
              ...input,
              branch: input.branch ?? staff.branch,
              paidBy: payer,
            });
            await refreshPaymentsFromApi();

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
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [getStaffById, refreshPaymentsFromApi]
  );

  const value = useMemo(
    () => ({
      payments,
      isLoaded,
      loadError,
      refreshPayments: refreshPaymentsFromApi,
      getPaymentById,
      getPaymentByExpenseId,
      getPaymentsForBranchDate,
      recordStaffPayment,
      recordStaffPaymentAsync,
    }),
    [
      payments,
      isLoaded,
      loadError,
      refreshPaymentsFromApi,
      getPaymentById,
      getPaymentByExpenseId,
      getPaymentsForBranchDate,
      recordStaffPayment,
      recordStaffPaymentAsync,
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
