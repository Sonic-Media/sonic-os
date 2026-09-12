"use client";

import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import { StaffSection } from "@/components/settings/staff-section";
import { ExpenseTemplatesSection } from "@/components/settings/expense-templates-section";
import { Input } from "@/components/shared/ui/input";
import { useSettings } from "@/context/settings-context";
import { useExpenseTemplates } from "@/context/expense-templates-context";
import { formatCurrency } from "@/lib/format";
import { parseAmount } from "@/lib/amounts";

export function SettingsBusinessPanel() {
  const { settings, updateSettings } = useSettings();
  const { updateTemplate } = useExpenseTemplates();

  return (
    <div className="space-y-6">
      <SettingsPanelShell
        title="Business"
        description="Configure your business identity and default operating values."
      >
        <div className="space-y-4">
          <Input
            label="Business Name"
            value={settings.businessName}
            onChange={(e) => {
              void updateSettings({ businessName: e.target.value }).then(
                (result) => {
                  if (!result.success) {
                    console.error(result.error ?? "Unable to save business name.");
                  }
                }
              );
            }}
          />
          <Input
            label="Owner Name"
            value={settings.ownerName}
            onChange={(e) => {
              void updateSettings({ ownerName: e.target.value }).then((result) => {
                if (!result.success) {
                  console.error(result.error ?? "Unable to save owner name.");
                }
              });
            }}
          />
          <Input
            label="Default Lunch"
            type="number"
            inputMode="numeric"
            min={0}
            value={String(settings.defaultLunchAmount)}
            onChange={(e) => {
              const amount = parseAmount(e.target.value);
              void updateSettings({ defaultLunchAmount: amount }).then(
                async (result) => {
                  if (!result.success) {
                    console.error(
                      result.error ?? "Unable to save default lunch amount."
                    );
                    return;
                  }

                  const templateResult = await updateTemplate("common-lunch", {
                    defaultAmount: amount,
                  });
                  if (!templateResult.success) {
                    console.error(
                      templateResult.error ??
                        "Unable to save lunch template amount."
                    );
                  }
                }
              );
            }}
            hint={`New entries default to ${formatCurrency(settings.defaultLunchAmount)}`}
          />
        </div>
      </SettingsPanelShell>

      <StaffSection />
      <ExpenseTemplatesSection />
    </div>
  );
}
