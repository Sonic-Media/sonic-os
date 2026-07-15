"use client";

import { useMemo, useState } from "react";
import { parseAmount } from "@/lib/amounts";
import {
  buildAdditionalExpenses,
  buildSeededCommonExpenses,
  buildStoredCommonExpenses,
} from "@/lib/expense-templates";
import { removeExpense, upsertExpense } from "@/lib/expenses";
import { useExpenseTemplates } from "@/context/expense-templates-context";
import type { Expense } from "@/types";

export function useExpenseList(
  expenses: Expense[],
  onChange: (expenses: Expense[]) => void,
  seedFromTemplates: boolean
) {
  const { templates, templateIds } = useExpenseTemplates();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const commonExpenses = useMemo(() => {
    if (seedFromTemplates) {
      return buildSeededCommonExpenses(expenses, templates);
    }
    return buildStoredCommonExpenses(expenses, templateIds);
  }, [expenses, seedFromTemplates, templates, templateIds]);

  const additionalExpenses = useMemo(
    () => buildAdditionalExpenses(expenses, templateIds),
    [expenses, templateIds]
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
    commonExpenses,
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
