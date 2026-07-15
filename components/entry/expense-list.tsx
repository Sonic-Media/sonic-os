"use client";

import { ExpenseRow } from "@/components/entry/expense-row";
import { AddExpenseForm } from "@/components/entry/add-expense-form";
import { useExpenseList } from "@/hooks/use-expense-list";
import { parseAmount } from "@/lib/amounts";
import type { Expense } from "@/types";

interface ExpenseListProps {
  expenses: Expense[];
  onChange: (expenses: Expense[]) => void;
  seedFromTemplates?: boolean;
}

export function ExpenseList({
  expenses,
  onChange,
  seedFromTemplates = false,
}: ExpenseListProps) {
  const {
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
  } = useExpenseList(expenses, onChange, seedFromTemplates);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
          Expense Categories
        </h3>
        <div className="space-y-3">
          {commonExpenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              variant="common"
              isEditing={editingId === expense.id}
              onAmountChange={(amount) =>
                saveExpense({
                  ...expense,
                  amount: parseAmount(amount),
                })
              }
              onEdit={() => setEditingId(expense.id)}
              onDelete={() => deleteExpense(expense.id)}
              onSave={(name, amount) =>
                handleSaveEdit(expense.id, name, amount)
              }
              onCancel={() => setEditingId(null)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
          Other Expense
        </h3>
        {additionalExpenses.map((expense) => (
          <ExpenseRow
            key={expense.id}
            expense={expense}
            variant="additional"
            isEditing={editingId === expense.id}
            onEdit={() => setEditingId(expense.id)}
            onDelete={() => deleteExpense(expense.id)}
            onSave={(name, amount) =>
              handleSaveEdit(expense.id, name, amount, true)
            }
            onCancel={() => setEditingId(null)}
          />
        ))}

        {showAddForm ? (
          <AddExpenseForm
            name={newName}
            amount={newAmount}
            onNameChange={setNewName}
            onAmountChange={setNewAmount}
            onSave={handleAddExpense}
            onCancel={handleCancelAdd}
          />
        ) : (
          <button
            type="button"
            onClick={openAddForm}
            className="text-sm font-medium text-white hover:text-zinc-300 transition-colors"
          >
            + Add Other Expense
          </button>
        )}
      </section>
    </div>
  );
}
