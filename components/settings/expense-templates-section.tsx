"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { useExpenseTemplates } from "@/context/expense-templates-context";
import { EXPENSE_TEMPLATE_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { getCategoryLabel } from "@/lib/expense-template-storage";
import { parseAmount } from "@/lib/amounts";
import type { ExpenseBreakdownKey, ExpenseTemplate } from "@/types";
import { cn } from "@/lib/utils";

function TemplateRow({ template }: { template: ExpenseTemplate }) {
  const { updateTemplate, deactivateTemplate, deleteTemplate } =
    useExpenseTemplates();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const [category, setCategory] = useState<ExpenseBreakdownKey>(
    template.category
  );
  const [defaultAmount, setDefaultAmount] = useState(
    template.defaultAmount !== undefined ? String(template.defaultAmount) : ""
  );

  function handleSave() {
    if (!name.trim()) return;
    updateTemplate(template.id, {
      name: name.trim(),
      category,
      defaultAmount:
        defaultAmount.trim() === ""
          ? undefined
          : parseAmount(defaultAmount),
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setName(template.name);
    setCategory(template.category);
    setDefaultAmount(
      template.defaultAmount !== undefined ? String(template.defaultAmount) : ""
    );
    setIsEditing(false);
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete ${template.name}? Existing entries keep their saved expense amounts.`
    );
    if (confirmed) {
      deleteTemplate(template.id);
    }
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select
          label="Category"
          value={category}
          options={EXPENSE_TEMPLATE_CATEGORIES.map(({ value, label }) => ({
            value,
            label,
          }))}
          onChange={(e) => setCategory(e.target.value as ExpenseBreakdownKey)}
        />
        <Input
          label="Default Amount (optional)"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Optional"
          value={defaultAmount}
          onChange={(e) => setDefaultAmount(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3">
      <div>
        <p className="font-medium text-white">{template.name}</p>
        <p className="text-sm text-zinc-500 mt-0.5">
          {getCategoryLabel(template.category)}
          {template.defaultAmount !== undefined &&
            ` · ${formatCurrency(template.defaultAmount)} default`}
        </p>
        {!template.active && (
          <p className="text-xs text-amber-400 mt-1">Inactive</p>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-1">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          Edit
        </button>
        {template.active ? (
          <button
            type="button"
            onClick={() => deactivateTemplate(template.id)}
            className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-amber-400 transition-colors"
          >
            Deactivate
          </button>
        ) : (
          <button
            type="button"
            onClick={() => updateTemplate(template.id, { active: true })}
            className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            Activate
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-red-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export function ExpenseTemplatesSection() {
  const { templates, addTemplate } = useExpenseTemplates();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExpenseBreakdownKey>("other");
  const [defaultAmount, setDefaultAmount] = useState("");

  const categoryOptions = useMemo(
    () =>
      EXPENSE_TEMPLATE_CATEGORIES.map(({ value, label }) => ({
        value,
        label,
      })),
    []
  );

  function handleAddTemplate() {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    addTemplate({
      name: trimmedName,
      category,
      defaultAmount:
        defaultAmount.trim() === "" ? undefined : parseAmount(defaultAmount),
    });
    setName("");
    setDefaultAmount("");
  }

  return (
    <Card>
      <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
        Expense Templates
      </h3>

      <div className="space-y-3 mb-4">
        {templates.length === 0 ? (
          <p className="text-sm text-zinc-500">No expense templates yet.</p>
        ) : (
          templates.map((template) => (
            <TemplateRow key={template.id} template={template} />
          ))
        )}
      </div>

      <div className={cn("space-y-3 border-t border-zinc-800/80 pt-4")}>
        <Input
          label="Add Expense Template"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select
          label="Category"
          value={category}
          options={categoryOptions}
          onChange={(e) => setCategory(e.target.value as ExpenseBreakdownKey)}
        />
        <Input
          label="Default Amount (optional)"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Optional"
          value={defaultAmount}
          onChange={(e) => setDefaultAmount(e.target.value)}
        />
        <Button type="button" className="w-full" onClick={handleAddTemplate}>
          Add Template
        </Button>
      </div>
    </Card>
  );
}
