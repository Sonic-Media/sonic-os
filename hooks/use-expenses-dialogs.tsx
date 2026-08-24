"use client";

import { useState } from "react";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import type { ExpenseRecord } from "@/types/expenses-module";

export type ExpenseDialogType = "add" | "historical" | "edit" | null;

export function useExpensesDialogs() {
  const [activeDialog, setActiveDialog] = useState<ExpenseDialogType>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(
    null
  );

  function closeDialog() {
    setActiveDialog(null);
    setSelectedExpense(null);
  }

  function openAddHistoricalExpense() {
    setSelectedExpense(null);
    setActiveDialog("historical");
  }

  function openEditExpense(expense: ExpenseRecord) {
    setSelectedExpense(expense);
    setActiveDialog("edit");
  }

  function renderDialogs() {
    return (
      <>
        {activeDialog === "historical" && (
          <ExpenseDialog
            key="historical-expense"
            mode="add"
            historical
            onClose={closeDialog}
          />
        )}
        {activeDialog === "edit" && selectedExpense && (
          <ExpenseDialog
            key={selectedExpense.id}
            mode="edit"
            expense={selectedExpense}
            onClose={closeDialog}
          />
        )}
      </>
    );
  }

  return {
    activeDialog,
    selectedExpense,
    openAddHistoricalExpense,
    openEditExpense,
    closeDialog,
    renderDialogs,
  };
}
