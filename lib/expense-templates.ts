import type { Expense, ExpenseTemplate } from "@/types";

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
  return templates
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
  return templates
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
