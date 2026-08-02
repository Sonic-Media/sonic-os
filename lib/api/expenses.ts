import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  ExpenseCategory,
  ExpenseCategoryInput,
  ExpenseCategoryUpdateInput,
  ExpenseRecord,
  ExpenseRecordInput,
  ExpenseRecordUpdateInput,
} from "@/types/expenses-module";

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  return apiGet<ExpenseCategory[]>("/api/expense-categories");
}

export async function createExpenseCategoryApi(
  input: ExpenseCategoryInput
): Promise<ExpenseCategory> {
  return apiPost<ExpenseCategory>("/api/expense-categories", input);
}

export async function updateExpenseCategoryApi(
  id: string,
  input: ExpenseCategoryUpdateInput
): Promise<ExpenseCategory> {
  return apiPatch<ExpenseCategory>(`/api/expense-categories/${id}`, input);
}

export async function deleteExpenseCategoryApi(id: string): Promise<void> {
  await apiDelete<{ id: string }>(`/api/expense-categories/${id}`);
}

export async function fetchExpenses(): Promise<ExpenseRecord[]> {
  return apiGet<ExpenseRecord[]>("/api/expenses");
}

export async function createExpenseApi(
  input: ExpenseRecordInput
): Promise<ExpenseRecord> {
  return apiPost<ExpenseRecord>("/api/expenses", input);
}

export async function updateExpenseApi(
  id: string,
  input: ExpenseRecordUpdateInput
): Promise<ExpenseRecord> {
  return apiPatch<ExpenseRecord>(`/api/expenses/${id}`, input);
}

export async function deleteExpenseApi(id: string): Promise<void> {
  await apiDelete<{ id: string }>(`/api/expenses/${id}`);
}
