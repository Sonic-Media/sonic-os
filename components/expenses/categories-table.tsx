import { ExpensesEmptyState } from "@/components/expenses/expenses-empty-state";
import { Card } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import type { ExpenseCategory } from "@/types/expenses-module";

interface CategoriesTableProps {
  categories: ExpenseCategory[];
  onEdit?: (category: ExpenseCategory) => void;
  onDelete?: (category: ExpenseCategory) => void;
}

export function CategoriesTable({
  categories,
  onEdit,
  onDelete,
}: CategoriesTableProps) {
  if (categories.length === 0) {
    return <ExpensesEmptyState message="No categories yet." />;
  }

  const showActions = Boolean(onEdit || onDelete);

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Name
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Type
              </th>
              {showActions && (
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr
                key={category.id}
                className="border-b border-zinc-800/60 last:border-b-0 transition-colors hover:bg-zinc-900/40"
              >
                <td className="px-5 py-4 font-medium text-white">
                  {category.name}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {category.isDefault ? "Default" : "Custom"}
                </td>
                {showActions && (
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-3"
                          onClick={() => onEdit(category)}
                        >
                          Edit
                        </Button>
                      )}
                      {onDelete && !category.isDefault && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-3 text-red-400 hover:text-red-300"
                          onClick={() => onDelete(category)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
