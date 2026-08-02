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
import { EXPENSES_CATEGORIES_STORAGE_KEY } from "@/lib/constants";
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
import type { StaffPaymentInput } from "@/types/staff-payment";
import {
  STAFF_PAYMENT_CATEGORY_ID,
  STAFF_PAYMENT_CATEGORY_NAME,
  getStaffPaymentTypeLabel,
} from "@/lib/expenses-module/constants";
import { validateStaffPaymentInput } from "@/lib/staff-payments/validation";

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
  addStaffPayment: (input: StaffPaymentInput) => ExpenseValidationResult;
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
  const { getStaffById } = useStaff();

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
      const loadedCategories = getExpenseCategories();
      setExpenses(getExpenseRecords());
      setCategories(loadedCategories);
      if (
        typeof window !== "undefined" &&
        !localStorage.getItem(EXPENSES_CATEGORIES_STORAGE_KEY)
      ) {
        saveExpenseCategories(loadedCategories);
      }
      setIsLoaded(true);
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

      const category = categoriesRef.current.find(
        (item) => item.id === input.categoryId
      );
      if (!category) {
        return createValidationResult({ categoryId: "Category not found." });
      }

      const staff = input.staffId ? getStaffById(input.staffId) : undefined;
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
        staffId: staff?.id,
        staffName: staff?.name,
        notes: input.notes?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      persistExpenses([record, ...expensesRef.current]);
      return createValidationResult({});
    },
    [getStaffById, persistExpenses]
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

      const staff = input.staffId ? getStaffById(input.staffId) : undefined;
      const now = new Date().toISOString();

      const nextExpenses = expensesRef.current.map((expense) =>
        expense.id === id
          ? {
              ...expense,
              date: input.date,
              categoryId: category.id,
              categoryName: category.name,
              description: input.description.trim(),
              amount: input.amount,
              paymentMethod: input.paymentMethod,
              branch: input.branch,
              staffId: staff?.id,
              staffName: staff?.name,
              notes: input.notes?.trim() || undefined,
              updatedAt: now,
            }
          : expense
      );

      persistExpenses(nextExpenses);
      return createValidationResult({});
    },
    [getStaffById, persistExpenses]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      persistExpenses(
        expensesRef.current.filter((expense) => expense.id !== id)
      );
    },
    [persistExpenses]
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

      const now = new Date().toISOString();
      const category: ExpenseCategory = {
        id: crypto.randomUUID(),
        name: normalizedName,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      };

      persistCategories([...categoriesRef.current, category]);
      return createValidationResult({});
    },
    [persistCategories]
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

      return createValidationResult({});
    },
    [persistCategories, persistExpenses]
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

      persistCategories(
        categoriesRef.current.filter((category) => category.id !== id)
      );
      return createValidationResult({});
    },
    [persistCategories]
  );

  const addStaffPayment = useCallback(
    (input: StaffPaymentInput): ExpenseValidationResult => {
      const errors = validateStaffPaymentInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const staff = getStaffById(input.staffId);
      if (!staff) {
        return createValidationResult({ staffId: "Staff member not found." });
      }

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

      const now = new Date().toISOString();
      const paymentLabel = getStaffPaymentTypeLabel(input.paymentType);
      const record: ExpenseRecord = {
        id: crypto.randomUUID(),
        date: input.date,
        categoryId: category.id,
        categoryName: category.name,
        description: `${paymentLabel} - ${staff.name}`,
        amount: Math.abs(input.amount),
        paymentMethod: input.paymentMethod,
        branch: staff.branch,
        staffId: staff.id,
        staffName: staff.name,
        staffRole: staff.role,
        staffPaymentType: input.paymentType,
        notes: input.notes?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      persistExpenses([record, ...expensesRef.current]);
      return createValidationResult({});
    },
    [getStaffById, persistCategories, persistExpenses]
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
      addStaffPayment,
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
      addStaffPayment,
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
