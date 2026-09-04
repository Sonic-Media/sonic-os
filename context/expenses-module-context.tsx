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
import { useBranch } from "@/context/branch-context";
import {
  createExpenseApi,
  createExpenseCategoryApi,
  deleteExpenseApi,
  deleteExpenseCategoryApi,
  fetchExpenseCategories,
  fetchExpenses,
  updateExpenseApi,
  updateExpenseCategoryApi,
} from "@/lib/api/expenses";
import {
  getDataSourceErrorMessage,
  loadFromApi,
  runOnApi,
} from "@/lib/data-source/context-api";
import { getTodayISO } from "@/lib/dates";
import {
  normalizeExpenseCategoryList,
  normalizeExpenseRecordList,
  sortExpenseCategoriesByName,
  sortExpenseRecordsByDate,
} from "@/lib/expenses-module-storage";
import { computeExpensesDashboardMetrics } from "@/lib/expenses-module/calculations";
import {
  hasValidationErrors,
  validateExpenseCategoryInput,
  validateExpenseRecordInput,
} from "@/lib/expenses-module/validation";
import type {
  ExpenseCategory,
  ExpenseCategoryInput,
  ExpenseCategoryUpdateInput,
  ExpenseRecord,
  ExpenseRecordInput,
  ExpenseRecordUpdateInput,
  ExpensesDashboardMetrics,
  ExpenseValidationResult,
} from "@/types/expenses-module";
import type { StaffPaymentInput, StaffPaymentRecord } from "@/types/staff-payment";
import {
  STAFF_PAYMENT_CATEGORY_ID,
} from "@/lib/expenses-module/constants";
import {
  DAY_CLOSED_EDIT_MESSAGE,
  isBranchDayClosed,
  isBranchDayOpened,
  SHOP_NOT_OPENED_MESSAGE,
} from "@/lib/day-closing/storage";
import { isStaffPaymentExpense } from "@/lib/staff-payments/calculations";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { pickAuditFields } from "@/lib/audit-log/snapshots";
import { resolveCurrentStaffAction } from "@/lib/staff/session";
import { recordStaffAction } from "@/lib/staff/audit";

interface ExpensesModuleContextValue {
  expenses: ExpenseRecord[];
  categories: ExpenseCategory[];
  metrics: ExpensesDashboardMetrics;
  isLoaded: boolean;
  loadError: string | null;
  getExpenseById: (id: string) => ExpenseRecord | undefined;
  getCategoryById: (id: string) => ExpenseCategory | undefined;
  addExpense: (input: ExpenseRecordInput) => ExpenseValidationResult;
  updateExpense: (
    id: string,
    input: ExpenseRecordUpdateInput
  ) => ExpenseValidationResult;
  deleteExpense: (id: string) => void;
  addCategory: (input: ExpenseCategoryInput) => ExpenseValidationResult;
  updateCategory: (
    id: string,
    input: ExpenseCategoryUpdateInput
  ) => ExpenseValidationResult;
  deleteCategory: (id: string) => ExpenseValidationResult;
  /** @deprecated Staff payment expenses are created by the Staff Payments API. */
  upsertStaffPaymentExpense: (expense: ExpenseRecord) => ExpenseValidationResult;
  /** @deprecated Legacy localStorage linking removed. */
  linkLegacyStaffPaymentExpenses: (payments: StaffPaymentRecord[]) => void;
  addStaffPayment: (input: StaffPaymentInput) => ExpenseValidationResult;
  refreshFromApi: () => Promise<void>;
}

const ExpensesModuleContext = createContext<ExpensesModuleContextValue | null>(
  null
);

function createValidationResult(
  errors: Record<string, string | undefined>
): ExpenseValidationResult {
  return {
    success: !hasValidationErrors(errors),
    errors,
  };
}

export function ExpensesModuleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeBranch } = useBranch();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const lastFetchedBranch = useRef<string | null>(null);
  const expensesRef = useRef(expenses);
  const categoriesRef = useRef(categories);

  useEffect(() => {
    expensesRef.current = expenses;
  }, [expenses]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const refreshFromApi = useCallback(async () => {
    const [remoteCategories, remoteExpenses] = await Promise.all([
      fetchExpenseCategories(),
      fetchExpenses(),
    ]);

    const normalizedCategories = sortExpenseCategoriesByName(
      normalizeExpenseCategoryList(remoteCategories)
    );
    const normalizedExpenses = sortExpenseRecordsByDate(
      normalizeExpenseRecordList(remoteExpenses)
    );

    categoriesRef.current = normalizedCategories;
    expensesRef.current = normalizedExpenses;
    setCategories(normalizedCategories);
    setExpenses(normalizedExpenses);
  }, []);

  useEffect(() => {
    if (hasLoaded.current && lastFetchedBranch.current === activeBranch) {
      return;
    }

    hasLoaded.current = true;
    lastFetchedBranch.current = activeBranch;

    queueMicrotask(() => {
      void (async () => {
        try {
          const [loadedCategories, loadedExpenses] = await Promise.all([
            loadFromApi(fetchExpenseCategories),
            loadFromApi(fetchExpenses),
          ]);

          const normalizedCategories = sortExpenseCategoriesByName(
            normalizeExpenseCategoryList(loadedCategories)
          );
          const normalizedExpenses = sortExpenseRecordsByDate(
            normalizeExpenseRecordList(loadedExpenses)
          );

          categoriesRef.current = normalizedCategories;
          expensesRef.current = normalizedExpenses;
          setCategories(normalizedCategories);
          setExpenses(normalizedExpenses);
          setLoadError(null);
        } catch (error) {
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          setIsLoaded(true);
        }
      })();
    });
  }, [activeBranch]);

  const expenseLookup = useMemo(
    () => new Map(expenses.map((expense) => [expense.id, expense])),
    [expenses]
  );

  const categoryLookup = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const getExpenseById = useCallback(
    (id: string) => expenseLookup.get(id),
    [expenseLookup]
  );

  const getCategoryById = useCallback(
    (id: string) => categoryLookup.get(id),
    [categoryLookup]
  );

  const metrics = useMemo(
    () => computeExpensesDashboardMetrics(expenses, getTodayISO()),
    [expenses]
  );

  const addExpense = useCallback(
    (input: ExpenseRecordInput): ExpenseValidationResult => {
      const errors = validateExpenseRecordInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      if (isBranchDayClosed(input.branch, input.date)) {
        return createValidationResult({ form: DAY_CLOSED_EDIT_MESSAGE });
      }
      if (!isBranchDayOpened(input.branch, input.date)) {
        return createValidationResult({ form: SHOP_NOT_OPENED_MESSAGE });
      }

      const category = categoriesRef.current.find(
        (item) => item.id === input.categoryId
      );
      if (!category) {
        return createValidationResult({ categoryId: "Category not found." });
      }

      void (async () => {
        try {
          await runOnApi(async () => {
            const created = await createExpenseApi(input);
            await refreshFromApi();

            const actor = resolveCurrentStaffAction(input.branch);
            recordStaffAction({
              staffId: actor?.staffId,
              staffName: actor?.staffName,
              role: actor?.role,
              branch: created.branch,
              action: AUDIT_ACTIONS.EXPENSE_ADDED,
              module: "expenses",
              recordId: created.id,
              newValues: pickAuditFields(created, [
                "id",
                "date",
                "categoryName",
                "description",
                "amount",
                "branch",
                "paymentMethod",
              ]),
            });
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshFromApi]
  );

  const updateExpense = useCallback(
    (
      id: string,
      input: ExpenseRecordUpdateInput
    ): ExpenseValidationResult => {
      const existing = expensesRef.current.find((expense) => expense.id === id);
      if (!existing) {
        return createValidationResult({ form: "Expense not found." });
      }

      if (existing.staffPaymentId || isStaffPaymentExpense(existing)) {
        return createValidationResult({
          form: "Staff payment expenses are managed in Staff Payments.",
        });
      }

      if (isBranchDayClosed(input.branch, input.date)) {
        return createValidationResult({ form: DAY_CLOSED_EDIT_MESSAGE });
      }
      if (!isBranchDayOpened(input.branch, input.date)) {
        return createValidationResult({ form: SHOP_NOT_OPENED_MESSAGE });
      }

      const errors = validateExpenseRecordInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const category = categoriesRef.current.find(
        (item) => item.id === input.categoryId
      );
      if (!category) {
        return createValidationResult({ categoryId: "Category not found." });
      }

      void (async () => {
        try {
          await runOnApi(async () => {
            const updated = await updateExpenseApi(id, input);
            await refreshFromApi();

            const actor = resolveCurrentStaffAction(input.branch);
            recordStaffAction({
              staffId: actor?.staffId,
              staffName: actor?.staffName,
              role: actor?.role,
              branch: updated.branch,
              action: AUDIT_ACTIONS.EXPENSE_EDITED,
              module: "expenses",
              recordId: updated.id,
              oldValues: pickAuditFields(existing, [
                "date",
                "categoryName",
                "description",
                "amount",
                "branch",
                "paymentMethod",
              ]),
              newValues: pickAuditFields(updated, [
                "date",
                "categoryName",
                "description",
                "amount",
                "branch",
                "paymentMethod",
              ]),
            });
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshFromApi]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      const existing = expensesRef.current.find((expense) => expense.id === id);
      if (
        existing?.staffPaymentId ||
        (existing && isStaffPaymentExpense(existing))
      ) {
        return;
      }

      if (
        existing &&
        (isBranchDayClosed(existing.branch, existing.date) ||
          !isBranchDayOpened(existing.branch, existing.date))
      ) {
        return;
      }

      void (async () => {
        try {
          await runOnApi(async () => {
            await deleteExpenseApi(id);
            await refreshFromApi();

            if (existing) {
              recordStaffAction({
                branch: existing.branch,
                action: AUDIT_ACTIONS.DELETE,
                module: "expenses",
                recordId: existing.id,
                oldValues: pickAuditFields(existing, [
                  "date",
                  "categoryName",
                  "description",
                  "amount",
                  "branch",
                ]),
              });
            }
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();
    },
    [refreshFromApi]
  );

  const upsertStaffPaymentExpense = useCallback(
    (_expense: ExpenseRecord): ExpenseValidationResult => {
      return createValidationResult({
        form: "Staff payment expenses are created through the Staff Payments API.",
      });
    },
    []
  );

  const linkLegacyStaffPaymentExpenses = useCallback(
    (_payments: StaffPaymentRecord[]) => {},
    []
  );

  const addStaffPayment = useCallback(
    (_input: StaffPaymentInput): ExpenseValidationResult => {
      return createValidationResult({
        form: "Use the Staff Payments module to record staff payouts.",
      });
    },
    []
  );

  const addCategory = useCallback(
    (input: ExpenseCategoryInput): ExpenseValidationResult => {
      const errors = validateExpenseCategoryInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const normalizedName = input.name.trim();
      const duplicate = categoriesRef.current.some(
        (category) =>
          category.name.toLowerCase() === normalizedName.toLowerCase()
      );
      if (duplicate) {
        return createValidationResult({
          name: "A category with this name already exists.",
        });
      }

      void (async () => {
        try {
          await runOnApi(async () => {
            const category = await createExpenseCategoryApi(input);
            await refreshFromApi();
            recordStaffAction({
              action: AUDIT_ACTIONS.CREATE,
              module: "expenses",
              recordId: category.id,
              newValues: pickAuditFields(category, ["id", "name"]),
            });
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshFromApi]
  );

  const updateCategory = useCallback(
    (
      id: string,
      input: ExpenseCategoryUpdateInput
    ): ExpenseValidationResult => {
      const existing = categoriesRef.current.find(
        (category) => category.id === id
      );
      if (!existing) {
        return createValidationResult({ form: "Category not found." });
      }

      if (id === STAFF_PAYMENT_CATEGORY_ID) {
        return createValidationResult({
          form: "Staff Payment is a system category and cannot be edited.",
        });
      }

      const errors = validateExpenseCategoryInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const normalizedName = input.name.trim();
      const duplicate = categoriesRef.current.some(
        (category) =>
          category.id !== id &&
          category.name.toLowerCase() === normalizedName.toLowerCase()
      );
      if (duplicate) {
        return createValidationResult({
          name: "A category with this name already exists.",
        });
      }

      void (async () => {
        try {
          await runOnApi(async () => {
            await updateExpenseCategoryApi(id, input);
            await refreshFromApi();
            recordStaffAction({
              action: AUDIT_ACTIONS.EDIT,
              module: "expenses",
              recordId: existing.id,
              oldValues: pickAuditFields(existing, ["name"]),
              newValues: { name: normalizedName },
            });
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshFromApi]
  );

  const deleteCategory = useCallback(
    (id: string): ExpenseValidationResult => {
      if (id === STAFF_PAYMENT_CATEGORY_ID) {
        return createValidationResult({
          form: "Staff Payment is a system category and cannot be deleted.",
        });
      }

      const inUse = expensesRef.current.some(
        (expense) => expense.categoryId === id
      );
      if (inUse) {
        return createValidationResult({
          form: "Cannot delete a category that is used by expenses.",
        });
      }

      const existing = categoriesRef.current.find((category) => category.id === id);
      if (!existing) {
        return createValidationResult({ form: "Category not found." });
      }

      void (async () => {
        try {
          await runOnApi(async () => {
            await deleteExpenseCategoryApi(id);
            await refreshFromApi();
            recordStaffAction({
              action: AUDIT_ACTIONS.DELETE,
              module: "expenses",
              recordId: existing.id,
              oldValues: pickAuditFields(existing, ["id", "name"]),
            });
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshFromApi]
  );

  const value = useMemo(
    () => ({
      expenses,
      categories,
      metrics,
      isLoaded,
      loadError,
      getExpenseById,
      getCategoryById,
      addExpense,
      updateExpense,
      deleteExpense,
      addCategory,
      updateCategory,
      deleteCategory,
      upsertStaffPaymentExpense,
      linkLegacyStaffPaymentExpenses,
      addStaffPayment,
      refreshFromApi,
    }),
    [
      expenses,
      categories,
      metrics,
      isLoaded,
      loadError,
      getExpenseById,
      getCategoryById,
      addExpense,
      updateExpense,
      deleteExpense,
      addCategory,
      updateCategory,
      deleteCategory,
      upsertStaffPaymentExpense,
      linkLegacyStaffPaymentExpenses,
      addStaffPayment,
      refreshFromApi,
    ]
  );

  return (
    <ExpensesModuleContext.Provider value={value}>
      {children}
    </ExpensesModuleContext.Provider>
  );
}

export function useExpensesModule() {
  const context = useContext(ExpensesModuleContext);
  if (!context) {
    throw new Error(
      "useExpensesModule must be used within an ExpensesModuleProvider"
    );
  }
  return context;
}
