"use client";

import { useState } from "react";
import { StockDialog, StockFieldError } from "@/components/stock/stock-dialog";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { Textarea } from "@/components/shared/ui/textarea";
import { useActiveBranch } from "@/context/active-branch-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { getTodayISO } from "@/lib/dates";
import { EXPENSE_PAYMENT_METHODS, filterSelectableExpenseCategories } from "@/lib/expenses-module/constants";
import { LATE_ENTRY_NOTE_PREFIX } from "@/lib/transactions/types";
import type { ExpensePaymentMethod, ExpenseRecord } from "@/types/expenses-module";

interface ExpenseDialogProps {
  mode: "add" | "edit";
  expense?: ExpenseRecord;
  historical?: boolean;
  onClose: () => void;
}

export function ExpenseDialog({
  mode,
  expense,
  historical = false,
  onClose,
}: ExpenseDialogProps) {
  const { categories, addExpense, updateExpense } = useExpensesModule();
  const { activeBranch } = useActiveBranch();

  const [date, setDate] = useState(expense?.date ?? getTodayISO());
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(
    expense ? String(expense.amount) : ""
  );
  const [paymentMethod, setPaymentMethod] = useState<
    ExpensePaymentMethod | ""
  >(expense?.paymentMethod ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const categoryOptions = filterSelectableExpenseCategories(categories).map(
    (category) => ({
      value: category.id,
      label: category.name,
    })
  );

  const paymentOptions = EXPENSE_PAYMENT_METHODS.map((method) => ({
    value: method.id,
    label: method.label,
  }));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsedAmount = Number.parseFloat(amount);
    const trimmedNotes = notes.trim();
    const historicalNotes = historical
      ? trimmedNotes
        ? `${LATE_ENTRY_NOTE_PREFIX} ${trimmedNotes}`
        : LATE_ENTRY_NOTE_PREFIX
      : trimmedNotes;

    const input = {
      date,
      categoryId,
      description,
      amount: parsedAmount,
      paymentMethod: paymentMethod as ExpensePaymentMethod,
      branch: mode === "edit" ? expense!.branch : activeBranch,
      notes: historicalNotes,
    };

    const result =
      mode === "add"
        ? addExpense(input)
        : updateExpense(expense!.id, input);

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    onClose();
  }

  return (
    <StockDialog
      title={historical ? "Add Historical Expense" : mode === "add" ? "New Expense" : "Edit Expense"}
      description="Record an operating expense."
      onClose={onClose}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form">
            Save Expense
          </Button>
        </div>
      }
    >
      <form id="expense-form" className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setErrors((current) => ({ ...current, date: undefined }));
            }}
          />
          <StockFieldError message={errors.date} />
        </div>

        <div>
          <Select
            label="Category"
            value={categoryId}
            placeholder="Select category"
            options={categoryOptions}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setErrors((current) => ({ ...current, categoryId: undefined }));
            }}
          />
          <StockFieldError message={errors.categoryId} />
        </div>

        <div>
          <Input
            label="Description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setErrors((current) => ({
                ...current,
                description: undefined,
              }));
            }}
            placeholder="What was this expense for?"
          />
          <StockFieldError message={errors.description} />
        </div>

        <div>
          <Input
            label="Amount"
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setErrors((current) => ({ ...current, amount: undefined }));
            }}
            placeholder="0"
          />
          <StockFieldError message={errors.amount} />
        </div>

        <div>
          <Select
            label="Payment Method"
            value={paymentMethod}
            placeholder="Select payment method"
            options={paymentOptions}
            onChange={(event) => {
              setPaymentMethod(event.target.value as ExpensePaymentMethod);
              setErrors((current) => ({
                ...current,
                paymentMethod: undefined,
              }));
            }}
          />
          <StockFieldError message={errors.paymentMethod} />
        </div>

        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Additional notes"
        />
      </form>
    </StockDialog>
  );
}
