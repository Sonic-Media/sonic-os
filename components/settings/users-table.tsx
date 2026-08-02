"use client";

import type { AppUser } from "@/types/auth";
import { USER_ROLE_LABELS } from "@/lib/auth/permissions";
import { useBranches } from "@/context/branches-context";
import { Card } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";

interface UsersTableProps {
  users: AppUser[];
  onEdit: (user: AppUser) => void;
  onResetPassword: (user: AppUser) => void;
  onDisable: (user: AppUser) => void;
  onEnable: (user: AppUser) => void;
}

export function UsersTable({
  users,
  onEdit,
  onResetPassword,
  onDisable,
  onEnable,
}: UsersTableProps) {
  const { getBranchName } = useBranches();

  if (users.length === 0) {
    return (
      <Card>
        <p className="text-sm text-zinc-500">No users yet.</p>
      </Card>
    );
  }

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
                Username
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Role
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Branch
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Status
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-zinc-800/60 last:border-b-0 transition-colors hover:bg-zinc-900/40"
              >
                <td className="px-5 py-4 font-medium text-white">
                  {user.displayName}
                </td>
                <td className="px-5 py-4 text-zinc-400">{user.username}</td>
                <td className="px-5 py-4 text-zinc-400">
                  {USER_ROLE_LABELS[user.role]}
                </td>
                <td className="px-5 py-4 text-zinc-400">
                  {getBranchName(user.branch)}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={
                      user.active ? "text-emerald-400" : "text-amber-400"
                    }
                  >
                    {user.active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 px-3"
                      onClick={() => onEdit(user)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 px-3"
                      onClick={() => onResetPassword(user)}
                    >
                      Reset Password
                    </Button>
                    {user.active ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 px-3 text-amber-400 hover:text-amber-300"
                        onClick={() => onDisable(user)}
                        disabled={user.role === "owner"}
                      >
                        Disable
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 px-3 text-emerald-400 hover:text-emerald-300"
                        onClick={() => onEnable(user)}
                      >
                        Enable
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
