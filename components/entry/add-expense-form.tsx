"use client";

import { Input } from "@/components/shared/ui/input";
import { Button } from "@/components/shared/ui/button";
import { EXPENSE_NAME_SUGGESTIONS } from "@/lib/constants";

interface AddExpenseFormProps {
  name: string;
  amount: string;
  onNameChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function AddExpenseForm({
  name,
  amount,
  onNameChange,
  onAmountChange,
  onSave,
  onCancel,
}: AddExpenseFormProps) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-4 space-y-3">
      <Input
        label="Expense Name"
        type="text"
        list="expense-name-suggestions"
        placeholder="e.g. Generator Repair"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
      />
      <datalist id="expense-name-suggestions">
        {EXPENSE_NAME_SUGGESTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <Input
        label="Amount (UGX)"
        type="number"
        inputMode="numeric"
        placeholder="0"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" onClick={onSave}>
          Save
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
