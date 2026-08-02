import { Card } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import type { BranchEntity } from "@/types/branch";

interface BranchesTableProps {
  branches: BranchEntity[];
  onEdit?: (branch: BranchEntity) => void;
  onDeactivate?: (branch: BranchEntity) => void;
  onReactivate?: (branch: BranchEntity) => void;
}

export function BranchesTable({
  branches,
  onEdit,
  onDeactivate,
  onReactivate,
}: BranchesTableProps) {
  if (branches.length === 0) {
    return (
      <Card>
        <p className="text-sm text-zinc-500">No branches yet.</p>
      </Card>
    );
  }

  const showActions = Boolean(onEdit || onDeactivate || onReactivate);

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Name
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Code
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Manager
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Phone
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Status
              </th>
              {showActions && (
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr
                key={branch.id}
                className="border-b border-zinc-800/60 last:border-b-0 transition-colors hover:bg-zinc-900/40"
              >
                <td className="px-5 py-4 font-medium text-white">{branch.name}</td>
                <td className="px-5 py-4 text-zinc-400">{branch.code}</td>
                <td className="px-5 py-4 text-zinc-400">
                  {branch.manager || "—"}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {branch.phone || "—"}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={
                      branch.active ? "text-emerald-400" : "text-amber-400"
                    }
                  >
                    {branch.active ? "Active" : "Inactive"}
                  </span>
                </td>
                {showActions && (
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-3"
                          onClick={() => onEdit(branch)}
                        >
                          Edit
                        </Button>
                      )}
                      {branch.active
                        ? onDeactivate && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-9 px-3 text-amber-400 hover:text-amber-300"
                              onClick={() => onDeactivate(branch)}
                            >
                              Deactivate
                            </Button>
                          )
                        : onReactivate && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-9 px-3 text-emerald-400 hover:text-emerald-300"
                              onClick={() => onReactivate(branch)}
                            >
                              Reactivate
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
