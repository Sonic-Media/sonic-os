"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { Input } from "@/components/shared/ui/input";
import { Button } from "@/components/shared/ui/button";
import type { Expense } from "@/types";
import { cn } from "@/lib/utils";

type ExpenseRowVariant = "common" | "additional";

interface ExpenseRowEditProps {
  expense: Expense;
  lockName?: boolean;
  onSave: (name: string, amount: string) => void;
  onCancel: () => void;
}

function ExpenseRowEdit({
  expense,
  lockName = false,
  onSave,
  onCancel,
}: ExpenseRowEditProps) {
  const [name, setName] = useState(expense.name);
  const [amount, setAmount] = useState(
    expense.amount > 0 ? String(expense.amount) : ""
  );

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-4 space-y-3">
      {lockName ? (
        <p className="text-sm font-medium text-white">{expense.name}</p>
      ) : (
        <Input
          label="Expense Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}
      <Input
        label="Amount (UGX)"
        type="number"
        inputMode="numeric"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => onSave(lockName ? expense.name : name, amount)}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function ExpenseRowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-red-400 transition-colors"
      >
        Delete
      </button>
    </div>
  );
}

interface ExpenseRowProps {
  expense: Expense;
  variant: ExpenseRowVariant;
  isEditing: boolean;
  onAmountChange?: (amount: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (name: string, amount: string) => void;
  onCancel: () => void;
}

export function ExpenseRow({
  expense,
  variant,
  isEditing,
  onAmountChange,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}: ExpenseRowProps) {
  if (isEditing) {
    return (
      <ExpenseRowEdit
        expense={expense}
        lockName={variant === "common"}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
  }

  const hasAmount = expense.amount > 0;

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 space-y-3">
      <div
        className={cn(
          "grid grid-cols-2 gap-3",
          variant === "common" ? "items-end" : undefined
        )}
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-400">
            Expense Name
          </label>
          <p className="h-12 flex items-center px-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-sm font-medium text-white">
            {expense.name}
          </p>
        </div>
        {variant === "common" ? (
          <Input
            label="Amount (UGX)"
            type="number"
            inputMode="numeric"
            placeholder=""
            value={expense.amount > 0 ? String(expense.amount) : ""}
            onChange={(e) => onAmountChange?.(e.target.value)}
          />
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-400">
              Amount (UGX)
            </label>
            <p
              className={cn(
                "h-12 flex items-center px-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-sm font-semibold",
                hasAmount ? "text-white" : "text-zinc-600"
              )}
            >
              {hasAmount ? formatCurrency(expense.amount) : "—"}
            </p>
          </div>
        )}
      </div>
      <ExpenseRowActions onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
