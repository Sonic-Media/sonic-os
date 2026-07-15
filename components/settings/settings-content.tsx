"use client";

import { Input } from "@/components/shared/ui/input";
import { Card } from "@/components/shared/ui/card";
import { useSettings } from "@/context/settings-context";
import { BRANCH_IDS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { parseAmount } from "@/lib/amounts";
import { StaffSection } from "@/components/settings/staff-section";
import { ExpenseTemplatesSection } from "@/components/settings/expense-templates-section";
import { useExpenseTemplates } from "@/context/expense-templates-context";
import type { Branch } from "@/types";

export function SettingsContent() {
  const { settings, updateSettings, version } = useSettings();
  const { updateTemplate } = useExpenseTemplates();

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

      <StaffSection />

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
