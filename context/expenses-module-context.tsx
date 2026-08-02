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
import { loadRemoteOrLocal, runRemoteOrLocal, shouldUseRemoteDataSource } from "@/lib/data-source/context-api";
import { getTodayISO } from "@/lib/dates";
import {
  getExpenseCategories,
  getExpenseRecords,
  normalizeExpenseCategoryList,
  normalizeExpenseRecordList,
  saveExpenseCategories,
  saveExpenseRecords,
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
  STAFF_PAYMENT_CATEGORY_NAME,
  isStaffPaymentCategory,
} from "@/lib/expenses-module/constants";
import {
  DAY_CLOSED_EDIT_MESSAGE,
  isBranchDayClosed,
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
  upsertStaffPaymentExpense: (expense: ExpenseRecord) => ExpenseValidationResult;
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
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() =>
    getExpenseRecords()
  );
  const [categories, setCategories] = useState<ExpenseCategory[]>(() =>
    getExpenseCategories()
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const hasLoaded = useRef(false);
  const expensesRef = useRef(expenses);
  const categoriesRef = useRef(categories);

  useEffect(() => {
    expensesRef.current = expenses;
  }, [expenses]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        const [loadedCategories, loadedExpenses] = await Promise.all([
          loadRemoteOrLocal({
            remote: fetchExpenseCategories,
            local: getExpenseCategories,
          }),
          loadRemoteOrLocal({
            remote: fetchExpenses,
            local: getExpenseRecords,
          }),
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
        setIsLoaded(true);
      })();
    });
  }, []);

  const persistExpenses = useCallback((next: ExpenseRecord[]) => {
    const normalized = sortExpenseRecordsByDate(
      normalizeExpenseRecordList(next)
    );
    saveExpenseRecords(normalized);
    expensesRef.current = normalized;
    setExpenses(normalized);
  }, []);

  const persistCategories = useCallback((next: ExpenseCategory[]) => {
    const normalized = sortExpenseCategoriesByName(
      normalizeExpenseCategoryList(next)
    );
    saveExpenseCategories(normalized);
    categoriesRef.current = normalized;
    setCategories(normalized);
  }, []);

  const refreshFromApi = useCallback(async () => {
    if (!(await shouldUseRemoteDataSource())) {
      return;
    }

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

      const category = categoriesRef.current.find(
        (item) => item.id === input.categoryId
      );
      if (!category) {
        return createValidationResult({ categoryId: "Category not found." });
      }

      void (async () => {
        await runRemoteOrLocal({
          remote: async () => {
            await createExpenseApi(input);
            await refreshFromApi();
          },
          local: () => {
            const actor = resolveCurrentStaffAction(input.branch);
            const now = new Date().toISOString();

            const record: ExpenseRecord = {
              id: crypto.randomUUID(),
              date: input.date,
              categoryId: category.id,
              categoryName: category.name,
              description: input.description.trim(),
              amount: input.amount,
              paymentMethod: input.paymentMethod,
              branch: input.branch,
              createdBy: actor,
              notes: input.notes?.trim() || undefined,
              createdAt: now,
              updatedAt: now,
            };

            persistExpenses([record, ...expensesRef.current]);
            recordStaffAction({
              staffId: actor?.staffId,
              staffName: actor?.staffName,
              role: actor?.role,
              branch: record.branch,
              action: AUDIT_ACTIONS.EXPENSE_ADDED,
              module: "expenses",
              recordId: record.id,
              newValues: pickAuditFields(record, [
                "id",
                "date",
                "categoryName",
                "description",
                "amount",
                "branch",
                "paymentMethod",
              ]),
            });
          },
        });
      })();

      return createValidationResult({});
    },
    [persistExpenses, refreshFromApi]
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
        await runRemoteOrLocal({
          remote: async () => {
            await updateExpenseApi(id, input);
            await refreshFromApi();
          },
          local: () => {
            const actor = resolveCurrentStaffAction(input.branch);
            const now = new Date().toISOString();

            const updated = {
              ...existing,
              date: input.date,
              categoryId: category.id,
              categoryName: category.name,
              description: input.description.trim(),
              amount: input.amount,
              paymentMethod: input.paymentMethod,
              branch: input.branch,
              createdBy: actor ?? existing.createdBy,
              notes: input.notes?.trim() || undefined,
              updatedAt: now,
            };

            const nextExpenses = expensesRef.current.map((expense) =>
              expense.id === id ? updated : expense
            );

            persistExpenses(nextExpenses);
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
          },
        });
      })();

      return createValidationResult({});
    },
    [persistExpenses, refreshFromApi]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      const existing = expensesRef.current.find((expense) => expense.id === id);
      if (existing?.staffPaymentId || (existing && isStaffPaymentExpense(existing))) {
        return;
      }

      void (async () => {
        await runRemoteOrLocal({
          remote: async () => {
            await deleteExpenseApi(id);
            await refreshFromApi();
          },
          local: () => {
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

            persistExpenses(
              expensesRef.current.filter((expense) => expense.id !== id)
            );
          },
        });
      })();
    },
    [persistExpenses, refreshFromApi]
  );

  const ensureStaffPaymentCategory = useCallback(() => {
    let category = categoriesRef.current.find(
      (item) => item.id === STAFF_PAYMENT_CATEGORY_ID
    );
    if (!category) {
      const now = new Date().toISOString();
      category = {
        id: STAFF_PAYMENT_CATEGORY_ID,
        name: STAFF_PAYMENT_CATEGORY_NAME,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      };
      persistCategories([...categoriesRef.current, category]);
    }
    return category;
  }, [persistCategories]);

  const upsertStaffPaymentExpense = useCallback(
    (expense: ExpenseRecord): ExpenseValidationResult => {
      ensureStaffPaymentCategory();
      persistExpenses([expense, ...expensesRef.current.filter((item) => item.id !== expense.id)]);
      return createValidationResult({});
    },
    [ensureStaffPaymentCategory, persistExpenses]
  );

  const linkLegacyStaffPaymentExpenses = useCallback(
    (payments: StaffPaymentRecord[]) => {
      const paymentByExpenseId = new Map(
        payments.map((payment) => [payment.expenseId, payment.id])
      );
      let changed = false;

      const nextExpenses = expensesRef.current.map((expense) => {
        if (!isStaffPaymentExpense(expense) || expense.staffPaymentId) {
          return expense;
        }

        const paymentId = paymentByExpenseId.get(expense.id);
        if (!paymentId) return expense;

        changed = true;
        return {
          ...expense,
          staffPaymentId: paymentId,
          categoryId: STAFF_PAYMENT_CATEGORY_ID,
          categoryName: STAFF_PAYMENT_CATEGORY_NAME,
          staffId: undefined,
          staffName: undefined,
          staffRole: undefined,
          staffPaymentType: undefined,
          paidBy: undefined,
        };
      });

      if (changed) {
        persistExpenses(nextExpenses);
      }
    },
    [persistExpenses]
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
        await runRemoteOrLocal({
          remote: async () => {
            await createExpenseCategoryApi(input);
            await refreshFromApi();
          },
          local: () => {
            const now = new Date().toISOString();
            const category: ExpenseCategory = {
              id: crypto.randomUUID(),
              name: normalizedName,
              isDefault: false,
              createdAt: now,
              updatedAt: now,
            };

            persistCategories([...categoriesRef.current, category]);
            recordStaffAction({
              action: AUDIT_ACTIONS.CREATE,
              module: "expenses",
              recordId: category.id,
              newValues: pickAuditFields(category, ["id", "name"]),
            });
          },
        });
      })();

      return createValidationResult({});
    },
    [persistCategories, refreshFromApi]
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
        await runRemoteOrLocal({
          remote: async () => {
            await updateExpenseCategoryApi(id, input);
            await refreshFromApi();
          },
          local: () => {
            const now = new Date().toISOString();
            const nextCategories = categoriesRef.current.map((category) =>
              category.id === id
                ? { ...category, name: normalizedName, updatedAt: now }
                : category
            );

            persistCategories(nextCategories);

            if (existing.name !== normalizedName) {
              const nextExpenses = expensesRef.current.map((expense) =>
                expense.categoryId === id
                  ? { ...expense, categoryName: normalizedName }
                  : expense
              );
              persistExpenses(nextExpenses);
            }

            recordStaffAction({
              action: AUDIT_ACTIONS.EDIT,
              module: "expenses",
              recordId: existing.id,
              oldValues: pickAuditFields(existing, ["name"]),
              newValues: { name: normalizedName },
            });
          },
        });
      })();

      return createValidationResult({});
    },
    [persistCategories, persistExpenses, refreshFromApi]
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
        await runRemoteOrLocal({
          remote: async () => {
            await deleteExpenseCategoryApi(id);
            await refreshFromApi();
          },
          local: () => {
            persistCategories(
              categoriesRef.current.filter((category) => category.id !== id)
            );
            recordStaffAction({
              action: AUDIT_ACTIONS.DELETE,
              module: "expenses",
              recordId: existing.id,
              oldValues: pickAuditFields(existing, ["id", "name"]),
            });
          },
        });
      })();

      return createValidationResult({});
    },
    [persistCategories, refreshFromApi]
  );

  const value = useMemo(
    () => ({
      expenses,
      categories,
      metrics,
      isLoaded,
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
