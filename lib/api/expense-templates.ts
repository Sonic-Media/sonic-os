import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { ExpenseTemplate } from "@/types";

export async function fetchExpenseTemplates(): Promise<ExpenseTemplate[]> {
  return apiGet<ExpenseTemplate[]>("/api/expense-templates");
}

export async function createExpenseTemplateApi(input: {
  name: string;
  category: ExpenseTemplate["category"];
  defaultAmount?: number;
}): Promise<ExpenseTemplate> {
  return apiPost<ExpenseTemplate>("/api/expense-templates", input);
}

export async function updateExpenseTemplateApi(
  id: string,
  patch: Partial<
    Pick<ExpenseTemplate, "name" | "category" | "defaultAmount" | "active">
  >
): Promise<ExpenseTemplate> {
  return apiPatch<ExpenseTemplate>("/api/expense-templates", { id, ...patch });
}

export async function deleteExpenseTemplateApi(id: string): Promise<void> {
  await apiDelete<{ id: string }>(`/api/expense-templates?id=${encodeURIComponent(id)}`);
}
