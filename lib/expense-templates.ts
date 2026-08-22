import type { Expense, ExpenseTemplate } from "@/types";

export function isStaffPaymentTemplate(template: ExpenseTemplate): boolean {
  return template.id === "common-staff-payments" || template.category === "staff-payments";
}

export function filterOperatingExpenseTemplates(
  templates: ExpenseTemplate[]
): ExpenseTemplate[] {
  return templates.filter((template) => !isStaffPaymentTemplate(template));
}

export function templateToExpense(template: ExpenseTemplate): Expense {
  return {
    id: template.id,
    name: template.name,
    amount: template.defaultAmount ?? 0,
  };
}

export function buildExpensesFromActiveTemplates(
  templates: ExpenseTemplate[]
): Expense[] {
  return filterOperatingExpenseTemplates(templates)
    .filter((template) => template.active)
    .map((template) => templateToExpense(template));
}

export function getTemplateIds(templates: ExpenseTemplate[]): Set<string> {
  return new Set(templates.map((template) => template.id));
}

export function buildSeededCommonExpenses(
  expenses: Expense[],
  templates: ExpenseTemplate[]
): Expense[] {
  return filterOperatingExpenseTemplates(templates)
    .filter((template) => template.active)
    .map((template) => {
      const stored = expenses.find((expense) => expense.id === template.id);
      return stored ?? templateToExpense(template);
    });
}

export function buildStoredCommonExpenses(
  expenses: Expense[],
  templateIds: Set<string>
): Expense[] {
  return expenses.filter((expense) => templateIds.has(expense.id));
}

export function buildAdditionalExpenses(
  expenses: Expense[],
  templateIds: Set<string>
): Expense[] {
  return expenses.filter((expense) => !templateIds.has(expense.id));
}

export function isTemplateExpense(
  expenseId: string,
  templateIds: Set<string>
): boolean {
  return templateIds.has(expenseId);
}
