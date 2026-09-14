"use client";

import { useRouter } from "next/navigation";
import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import { Button } from "@/components/shared/ui/button";
import { useAuth } from "@/context/auth-context";
import { isCashierRole } from "@/lib/auth/permissions";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

function SecurityLinkCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className={cn(uiSurface.cardInset, "space-y-3 p-4 sm:p-5")}>
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-zinc-400">{description}</p>
      </div>
      <Button href={href} variant="secondary">
        Open
      </Button>
    </div>
  );
}

export function SettingsSecurityPanel() {
  const router = useRouter();
  const {
    session,
    canManageUsers,
    canImportHistoricalData,
    canManageRoles,
    canViewAuditLog,
    lock,
    logout,
  } = useAuth();

  function handleLock() {
    lock();
    router.push("/lock");
  }

  return (
    <div className="space-y-6">
      <SettingsPanelShell
        title="Security"
        description="Manage users, roles, audit history, and session controls."
      >
        <div className="space-y-4">
          {canManageUsers ? (
            <SecurityLinkCard
              title="Users"
              description="Manage local Sonic OS users, roles, and passwords."
              href="/settings/users"
            />
          ) : null}

          {canManageRoles ? (
            <SecurityLinkCard
              title="Roles"
              description="Review default staff roles and the modules each role can access."
              href="/settings/roles"
            />
          ) : null}

          {canViewAuditLog ? (
            <SecurityLinkCard
              title="Audit Log"
              description="Review immutable records of important actions across the system."
              href="/settings/audit-log"
            />
          ) : null}

          {canImportHistoricalData ? (
            <SecurityLinkCard
              title="Historical Import"
              description="Import historical daily operations records with preview, validation, and undo support."
              href="/settings/import"
            />
          ) : null}

          {!canManageUsers &&
          !canManageRoles &&
          !canViewAuditLog &&
          !canImportHistoricalData ? (
            <p className="text-sm text-zinc-500">
              Additional security tools are available to owners and authorized
              roles.
            </p>
          ) : null}
        </div>
      </SettingsPanelShell>

      {session ? (
        <SettingsPanelShell
          title="Session"
          description="Lock or sign out of Sonic OS on this device."
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            {!isCashierRole(session.role) ? (
              <Button type="button" variant="secondary" onClick={handleLock}>
                Lock Session
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={logout}
              className="text-red-400 hover:text-red-300"
            >
              Sign Out
            </Button>
          </div>
        </SettingsPanelShell>
      ) : null}
    </div>
  );
}
