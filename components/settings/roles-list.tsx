"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/shared/ui/card";
import { fetchRoles } from "@/lib/api/roles";
import { loadRemoteOrLocal } from "@/lib/data-source/context-api";
import {
  DEFAULT_STAFF_ROLES,
  STAFF_MODULE_LABELS,
} from "@/lib/staff/roles";
import type { StaffRoleDefinition } from "@/types/staff-role";

export function RolesList() {
  const [roles, setRoles] = useState<StaffRoleDefinition[]>(DEFAULT_STAFF_ROLES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void loadRemoteOrLocal({
      remote: () => fetchRoles(),
      local: () => DEFAULT_STAFF_ROLES,
    }).then((loaded) => {
      setRoles(loaded.length > 0 ? loaded : DEFAULT_STAFF_ROLES);
      setIsLoaded(true);
    });
  }, []);

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        {DEFAULT_STAFF_ROLES.slice(0, 3).map((role) => (
          <Card key={role.id} className="animate-pulse">
            <div className="h-5 w-32 rounded bg-zinc-800" />
            <div className="mt-3 h-4 w-full rounded bg-zinc-900" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {roles.map((role) => (
        <Card key={role.id}>
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">{role.name}</h3>
              <p className="text-sm text-zinc-500">{role.description}</p>
            </div>
            {role.isDefault && (
              <span className="inline-flex w-fit rounded-full border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-400">
                Default role
              </span>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Default Permissions
            </p>
            <div className="flex flex-wrap gap-2">
              {role.modules.map((module) => (
                <span
                  key={`${role.id}-${module}`}
                  className="rounded-full border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {STAFF_MODULE_LABELS[module]}
                </span>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
