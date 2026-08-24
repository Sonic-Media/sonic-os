"use client";

import { Input } from "@/components/shared/ui/input";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { useSettings } from "@/context/settings-context";
import { BRANCH_IDS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { parseAmount } from "@/lib/amounts";
import { StaffSection } from "@/components/settings/staff-section";
import { ExpenseTemplatesSection } from "@/components/settings/expense-templates-section";
import { useExpenseTemplates } from "@/context/expense-templates-context";
import { useAuth } from "@/context/auth-context";
import type { Branch } from "@/types";

export function SettingsContent() {
  const { settings, updateSettings, version } = useSettings();
  const { updateTemplate } = useExpenseTemplates();
  const { canManageUsers, canImportHistoricalData, canManageRoles, canViewAuditLog } = useAuth();

  function updateBranchName(branch: Branch, name: string) {
    updateSettings({
      branchNames: {
        ...settings.branchNames,
        [branch]: name,
      },
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
          Business
        </h3>
        <div className="space-y-4">
          <Input
            label="Business Name"
            value={settings.businessName}
            onChange={(e) => updateSettings({ businessName: e.target.value })}
          />
          {BRANCH_IDS.map((branchId) => (
            <Input
              key={branchId}
              label={`${settings.branchNames[branchId]} Branch Name`}
              value={settings.branchNames[branchId]}
              onChange={(e) => updateBranchName(branchId, e.target.value)}
            />
          ))}
          <Input
            label="Default Lunch"
            type="number"
            inputMode="numeric"
            min={0}
            value={String(settings.defaultLunchAmount)}
            onChange={(e) => {
              const amount = parseAmount(e.target.value);
              updateSettings({ defaultLunchAmount: amount });
              updateTemplate("common-lunch", { defaultAmount: amount });
            }}
            hint={`New entries default to ${formatCurrency(settings.defaultLunchAmount)}`}
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
          Account
        </h3>
        <Input
          label="Owner Name"
          value={settings.ownerName}
          onChange={(e) => updateSettings({ ownerName: e.target.value })}
        />
      </Card>

      {canManageUsers && (
        <Card>
          <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
            Users
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Manage local Sonic OS users, roles, and passwords.
          </p>
          <Button href="/settings/users" variant="secondary">
            Manage Users
          </Button>
        </Card>
      )}

      {canImportHistoricalData && (
        <Card>
          <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
            Historical Import
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Import historical daily operations records with preview, validation,
            and undo support.
          </p>
          <Button href="/settings/import" variant="secondary">
            Import Historical Data
          </Button>
        </Card>
      )}

      {canViewAuditLog && (
        <Card>
          <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
            Audit Log
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Review immutable records of important actions across the system.
          </p>
          <Button href="/settings/audit-log" variant="secondary">
            View Audit Log
          </Button>
        </Card>
      )}

      {canManageRoles && (
        <Card>
          <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
            Roles
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Review default staff roles and the modules each role can access.
          </p>
          <Button href="/settings/roles" variant="secondary">
            Manage Roles
          </Button>
        </Card>
      )}

      <StaffSection />

      <Card>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Expense Settings
        </h3>
        <p className="mb-4 text-sm text-zinc-400">
          Manage expense categories used across Sonic OS.
        </p>
        <Button href="/settings/expense-settings" variant="secondary">
          Manage Expense Categories
        </Button>
      </Card>

      <ExpenseTemplatesSection />

      <Card>
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
          About
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-white">Version</span>
          <span className="text-zinc-400">{version}</span>
        </div>
      </Card>
    </div>
  );
}
