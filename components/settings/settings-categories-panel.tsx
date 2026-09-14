"use client";

import { useState } from "react";
import { CategoriesTable } from "@/components/expenses/categories-table";
import { CategoryDialog } from "@/components/expenses/category-dialog";
import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import { Button } from "@/components/shared/ui/button";
import { useExpensesModule } from "@/context/expenses-module-context";
import { filterSelectableExpenseCategories } from "@/lib/expenses-module/constants";
import type { ExpenseCategory } from "@/types/expenses-module";

export function SettingsCategoriesPanel() {
  const { categories, deleteCategory } = useExpensesModule();
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategory | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function openAddCategory() {
    setSelectedCategory(null);
    setDialogMode("add");
    setErrorMessage(null);
  }

  function openEditCategory(category: ExpenseCategory) {
    setSelectedCategory(category);
    setDialogMode("edit");
    setErrorMessage(null);
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedCategory(null);
  }

  async function handleDelete(category: ExpenseCategory) {
    const confirmed = window.confirm(
      `Delete category "${category.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    const result = await deleteCategory(category.id);
    if (!result.success) {
      setErrorMessage(result.errors.form ?? "Unable to delete category.");
    } else {
      setErrorMessage(null);
    }
  }

  return (
    <>
      <SettingsPanelShell
        title="Categories"
        description="Manage expense categories used across Sonic OS."
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" onClick={openAddCategory}>
              Add Category
            </Button>
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-400">{errorMessage}</p>
          ) : null}

          <CategoriesTable
            categories={filterSelectableExpenseCategories(categories)}
            onEdit={openEditCategory}
            onDelete={handleDelete}
          />
        </div>
      </SettingsPanelShell>

      {dialogMode === "add" ? (
        <CategoryDialog mode="add" onClose={closeDialog} />
      ) : null}

      {dialogMode === "edit" && selectedCategory ? (
        <CategoryDialog
          mode="edit"
          category={selectedCategory}
          onClose={closeDialog}
        />
      ) : null}
    </>
  );
}
