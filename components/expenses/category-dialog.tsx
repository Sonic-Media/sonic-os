"use client";

import { useState } from "react";
import { StockDialog, StockFieldError } from "@/components/stock/stock-dialog";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { useExpensesModule } from "@/context/expenses-module-context";
import type { ExpenseCategory } from "@/types/expenses-module";

interface CategoryDialogProps {
  mode: "add" | "edit";
  category?: ExpenseCategory;
  onClose: () => void;
}

export function CategoryDialog({
  mode,
  category,
  onClose,
}: CategoryDialogProps) {
  const { addCategory, updateCategory } = useExpensesModule();
  const [name, setName] = useState(category?.name ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result =
      mode === "add"
        ? addCategory({ name })
        : updateCategory(category!.id, { name });

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    onClose();
  }

  return (
    <StockDialog
      title={mode === "add" ? "Add Category" : "Edit Category"}
      description="Manage expense categories."
      onClose={onClose}
      className="max-w-md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="category-form">
            {mode === "add" ? "Add Category" : "Save Changes"}
          </Button>
        </div>
      }
    >
      <form id="category-form" className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Input
            label="Name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            placeholder="Category name"
          />
          <StockFieldError message={errors.name || errors.form} />
        </div>
      </form>
    </StockDialog>
  );
}
