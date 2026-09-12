"use client";

import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import { useSettings } from "@/context/settings-context";

export function SettingsAppearancePanel() {
  const { version } = useSettings();

  return (
    <SettingsPanelShell
      title="Appearance"
      description="Sonic OS uses a fixed premium dark theme optimized for operations."
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Theme
          </p>
          <p className="mt-2 text-sm text-white">Sonic OS Dark</p>
          <p className="mt-1 text-sm text-zinc-500">
            High-contrast dark surfaces with indigo and violet accents.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
          <span className="text-sm text-white">Version</span>
          <span className="text-sm tabular-nums text-zinc-400">{version}</span>
        </div>
      </div>
    </SettingsPanelShell>
  );
}
