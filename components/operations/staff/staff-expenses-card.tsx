"use client";

import { useMemo, useState } from "react";
import { AddExpenseForm } from "@/components/entry/add-expense-form";
import { StaffOperationCard } from "@/components/operations/staff/staff-operation-card";
import {
  StaffAnimatedMoney,
  StaffCollapsedSummary,
  StaffDotLeaderRow,
  StaffPremiumButton,
  StaffSectionLabel,
} from "@/components/operations/staff/primitives";
import { StockDialog } from "@/components/stock/stock-dialog";
import { useExpenseList } from "@/hooks/use-expense-list";
import { calculateExpenses, parseAmount } from "@/lib/amounts";
import { isPayrollEntryExpense } from "@/lib/expenses";
import { formatCurrency } from "@/lib/format";
import type { EntryFormData } from "@/types";

interface StaffExpensesCardProps {
  form: EntryFormData;
  seedCommonExpenses?: boolean;
  updateField: <K extends keyof EntryFormData>(
    key: K,
    value: EntryFormData[K]
  ) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function StaffExpensesCard({
  form,
  seedCommonExpenses = false,
  updateField,
  expanded,
  onExpandedChange,
}: StaffExpensesCardProps) {
  const [showModal, setShowModal] = useState(false);
  const totalExpenses = useMemo(() => calculateExpenses(form), [form]);

  const {
    commonExpenses,
    additionalExpenses,
    newName,
    setNewName,
    newAmount,
    setNewAmount,
    saveExpense,
    handleCancelAdd,
    openAddForm,
  } = useExpenseList(form.expenses, (expenses) => updateField("expenses", expenses), seedCommonExpenses);

  const recordedExpenses = useMemo(() => {
    return [...commonExpenses, ...additionalExpenses]
      .filter((expense) => expense.amount > 0 && !isPayrollEntryExpense(expense))
      .sort((a, b) => b.amount - a.amount);
  }, [commonExpenses, additionalExpenses]);

  const expenseCount = recordedExpenses.length;
  const expenseCountLabel =
    expenseCount === 1 ? "1 expense" : `${expenseCount} expenses`;

  const quickCategories = useMemo(
    () =>
      commonExpenses.filter(
        (expense) => expense.amount <= 0 && !isPayrollEntryExpense(expense)
      ),
    [commonExpenses]
  );

  function openModal() {
    openAddForm();
    setShowModal(true);
  }

  function closeModal() {
    handleCancelAdd();
    setShowModal(false);
  }

  function handleSaveExpense() {
    const trimmedName = newName.trim();
    const parsedAmount = parseAmount(newAmount);
    if (!trimmedName || parsedAmount <= 0) return;

    const templateMatch = commonExpenses.find(
      (item) => item.name.toLowerCase() === trimmedName.toLowerCase()
    );

    saveExpense({
      id: templateMatch?.id ?? crypto.randomUUID(),
      name: trimmedName,
      amount: parsedAmount,
    });
    setNewName("");
    setNewAmount("");
    setShowModal(false);
  }

  function handleQuickCategory(name: string) {
    setNewName(name);
    setNewAmount("");
    setShowModal(true);
  }

  return (
    <>
      <StaffOperationCard
        accent="expenses"
        title="Expenses"
        description="Track fuel, lunch, transport, and other costs."
        expanded={expanded}
        onExpandedChange={onExpandedChange}
        collapsedPreview={
          expenseCount > 0 ? (
            <StaffCollapsedSummary
              primary={expenseCountLabel}
              secondary={formatCurrency(totalExpenses)}
            />
          ) : (
            <span className="text-sm text-zinc-500">No expenses yet</span>
          )
        }
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-5 py-4">
            <StaffSectionLabel>Running Total</StaffSectionLabel>
            <div className="mt-3">
              <StaffAnimatedMoney
                value={totalExpenses}
                className="text-2xl font-bold text-amber-200/90"
                fromZero={false}
              />
            </div>
          </div>

          {recordedExpenses.length === 0 ? (
            <p className="text-sm text-zinc-500">No expenses recorded yet.</p>
          ) : (
            <div className="rounded-2xl border border-white/[0.05] bg-black/15 px-4 py-2">
              {recordedExpenses.map((expense) => (
                <StaffDotLeaderRow
                  key={expense.id}
                  title={expense.name}
                  value={formatCurrency(expense.amount)}
                />
              ))}
            </div>
          )}

          <StaffPremiumButton
            type="button"
            onClick={openModal}
            className="w-full bg-amber-500/90 text-zinc-950 hover:bg-amber-400"
          >
            + Add Expense
          </StaffPremiumButton>
        </div>
      </StaffOperationCard>

      {showModal ? (
        <StockDialog
          title="Add Expense"
          description="Record a business expense for today."
          onClose={closeModal}
        >
          {quickCategories.length > 0 ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {quickCategories.slice(0, 8).map((expense) => (
                <button
                  key={expense.id}
                  type="button"
                  onClick={() => handleQuickCategory(expense.name)}
                  className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/30 hover:text-white"
                >
                  {expense.name}
                </button>
              ))}
            </div>
          ) : null}

          <AddExpenseForm
            name={newName}
            amount={newAmount}
            onNameChange={setNewName}
            onAmountChange={setNewAmount}
            onSave={handleSaveExpense}
            onCancel={closeModal}
          />
        </StockDialog>
      ) : null}
    </>
  );
}
