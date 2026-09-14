"use client";

import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import { Input } from "@/components/shared/ui/input";
import { useSettings } from "@/context/settings-context";
import { useBranches } from "@/context/branches-context";
import {
  getEquivalentBranchCodes,
  resolveInventoryBranchCode,
} from "@/lib/branch/codes";
import { uiSurface } from "@/lib/ui/design-tokens";
import type { Branch } from "@/types";
import type { BranchEntity } from "@/types/branch";
import { cn } from "@/lib/utils";

function BranchDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="text-sm text-zinc-300">{value}</p>
    </div>
  );
}

function resolveBranchEntity(
  branchId: Branch,
  activeBranches: BranchEntity[]
): BranchEntity | undefined {
  const equivalents = getEquivalentBranchCodes(branchId);
  return activeBranches.find((branch) =>
    equivalents.includes(resolveInventoryBranchCode(branch.code))
  );
}

export function SettingsBranchesPanel() {
  const { settings, updateSettings, branches: branchConfigs } = useSettings();
  const { activeBranches } = useBranches();

  async function updateBranchName(branch: Branch, name: string) {
    const result = await updateSettings({
      branchNames: {
        ...settings.branchNames,
        [branch]: name,
      },
    });

    if (!result.success) {
      console.error(result.error ?? "Unable to save branch name.");
    }
  }

  return (
    <SettingsPanelShell
      title="Branches"
      description="Manage branch display names and review location details."
    >
      <div className="space-y-4">
        {branchConfigs.map((branch) => {
          const entity = resolveBranchEntity(branch.id, activeBranches);
          const displayName = settings.branchNames[branch.id] ?? branch.name;

          return (
            <div
              key={branch.id}
              className={cn(uiSurface.cardInset, "space-y-4 p-4 sm:p-5")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {displayName}
                  </h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-500">
                    {entity?.code ?? branch.id}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
                    entity?.active !== false
                      ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                      : "bg-zinc-800/60 text-zinc-400 ring-1 ring-white/[0.06]"
                  )}
                >
                  {entity?.active === false ? "Inactive" : "Active"}
                </span>
              </div>

              <Input
                label="Display Name"
                value={displayName}
                onChange={(e) => {
                  void updateBranchName(branch.id, e.target.value);
                }}
              />

              {entity?.address ? (
                <BranchDetail label="Address" value={entity.address} />
              ) : null}
              {entity?.phone ? (
                <BranchDetail label="Phone" value={entity.phone} />
              ) : null}
              {entity?.manager ? (
                <BranchDetail label="Manager" value={entity.manager} />
              ) : null}
            </div>
          );
        })}
      </div>
    </SettingsPanelShell>
  );
}
