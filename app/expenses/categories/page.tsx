"use client";

import { useState } from "react";
import { CategoriesTable } from "@/components/expenses/categories-table";
import { CategoryDialog } from "@/components/expenses/category-dialog";
import { ExpensesSubnav } from "@/components/expenses/expenses-subnav";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { useExpensesModule } from "@/context/expenses-module-context";
import { filterSelectableExpenseCategories } from "@/lib/expenses-module/constants";
import type { ExpenseCategory } from "@/types/expenses-module";

export default function ExpensesCategoriesPage() {
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

  function handleDelete(category: ExpenseCategory) {
    const confirmed = window.confirm(
      `Delete category "${category.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    const result = deleteCategory(category.id);
    if (!result.success) {
      setErrorMessage(result.errors.form ?? "Unable to delete category.");
    } else {
      setErrorMessage(null);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Categories"
        subtitle="Editable expense categories"
      />

      <div className="mb-6 flex justify-end">
        <Button type="button" onClick={openAddCategory}>
          Add Category
        </Button>
      </div>

      <ExpensesSubnav />

      {errorMessage && (
        <p className="mb-4 text-sm text-red-400">{errorMessage}</p>
      )}

      <CategoriesTable
        categories={filterSelectableExpenseCategories(categories)}
        onEdit={openEditCategory}
        onDelete={handleDelete}
      />

      {dialogMode === "add" && (
        <CategoryDialog mode="add" onClose={closeDialog} />
      )}

      {dialogMode === "edit" && selectedCategory && (
        <CategoryDialog
          mode="edit"
          category={selectedCategory}
          onClose={closeDialog}
        />
      )}
    </PageContainer>
  );
}
