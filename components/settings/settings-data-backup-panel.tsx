"use client";

import { DataProtectionSection } from "@/components/settings/data-protection-section";
import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import { Button } from "@/components/shared/ui/button";
import { useAuth } from "@/context/auth-context";

export function SettingsDataBackupPanel() {
  const { canManageUsers } = useAuth();

  if (!canManageUsers) {
    return (
      <SettingsPanelShell
        title="Data & Backup"
        description="Backup and data protection tools are available to owners only."
      >
        <p className="text-sm text-zinc-500">
          Contact an owner to manage backups or maintenance tools.
        </p>
      </SettingsPanelShell>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsPanelShell
        title="Data & Backup"
        description="Create backups and access owner-only data protection tools."
        bare
      >
        <DataProtectionSection />
      </SettingsPanelShell>

      <SettingsPanelShell
        title="Maintenance"
        description="Owner-only maintenance tools for backups and controlled business data resets."
      >
        <Button href="/settings/maintenance" variant="secondary">
          Open Maintenance
        </Button>
      </SettingsPanelShell>
    </div>
  );
}
