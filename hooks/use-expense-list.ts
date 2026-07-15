import { useMemo, useState } from "react";
import { DEFAULT_EXPENSES } from "@/lib/constants";
import { parseAmount } from "@/lib/amounts";
import { removeExpense, upsertExpense } from "@/lib/expenses";
import type { Expense } from "@/types";

export function useExpenseList(
  expenses: Expense[],
  onChange: (expenses: Expense[]) => void
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const defaultExpenseIds = useMemo(
    () => new Set(DEFAULT_EXPENSES.map((expense) => expense.id)),
    []
  );

  const defaultExpenses = useMemo(
    () =>
      DEFAULT_EXPENSES.map(
        (template) =>
          expenses.find((expense) => expense.id === template.id) ?? {
            ...template,
            amount: 0,
          }
      ),
    [expenses]
  );

  const additionalExpenses = useMemo(
    () => expenses.filter((expense) => !defaultExpenseIds.has(expense.id)),
    [expenses, defaultExpenseIds]
  );

  function saveExpense(expense: Expense) {
    onChange(upsertExpense(expenses, expense));
    setEditingId(null);
  }

  function deleteExpense(id: string) {
    onChange(removeExpense(expenses, id));
    setEditingId(null);
  }

  function handleSaveEdit(
    id: string,
    name: string,
    amount: string,
    requireAmount = false
  ) {
    const trimmedName = name.trim();
    const parsedAmount = parseAmount(amount);
    if (!trimmedName || (requireAmount && parsedAmount <= 0)) return;

    saveExpense({ id, name: trimmedName, amount: parsedAmount });
  }

  function handleAddExpense() {
    const trimmedName = newName.trim();
    const parsedAmount = parseAmount(newAmount);
    if (!trimmedName || parsedAmount <= 0) return;

    saveExpense({
      id: crypto.randomUUID(),
      name: trimmedName,
      amount: parsedAmount,
    });
    setNewName("");
    setNewAmount("");
    setShowAddForm(false);
  }

  function handleCancelAdd() {
    setShowAddForm(false);
    setNewName("");
    setNewAmount("");
  }

  function openAddForm() {
    setEditingId(null);
    setShowAddForm(true);
  }

  return {
    defaultExpenses,
    additionalExpenses,
    editingId,
    setEditingId,
    showAddForm,
    newName,
    setNewName,
    newAmount,
    setNewAmount,
    saveExpense,
    deleteExpense,
    handleSaveEdit,
    handleAddExpense,
    handleCancelAdd,
    openAddForm,
  };
}
