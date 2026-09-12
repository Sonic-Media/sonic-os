"use client";

import { useCallback, useState } from "react";
import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import { Button } from "@/components/shared/ui/button";
import { useNotificationCenter } from "@/hooks/use-notification-center";
import {
  clearNotificationPreferences,
  getNotificationPreferences,
} from "@/lib/notification-storage";

export function SettingsNotificationsPanel() {
  const { alerts, unreadCount, markAllRead, dismissVisible } =
    useNotificationCenter();
  const [preferences, setPreferences] = useState(getNotificationPreferences);

  const refreshPreferences = useCallback(() => {
    setPreferences(getNotificationPreferences());
  }, []);

  function handleMarkAllRead() {
    markAllRead();
    refreshPreferences();
  }

  function handleDismissVisible() {
    dismissVisible();
    refreshPreferences();
  }

  function handleResetPreferences() {
    const confirmed = window.confirm(
      "Reset all notification preferences? Read and dismissed states will be cleared."
    );
    if (!confirmed) return;

    clearNotificationPreferences();
    refreshPreferences();
  }

  return (
    <SettingsPanelShell
      title="Notifications"
      description="Manage how business alerts are marked read or dismissed on this device."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Active Alerts
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
              {alerts.length}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Unread
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
              {unreadCount}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Dismissed
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
              {preferences.dismissedIds.length}
            </p>
          </div>
        </div>

        <p className="text-sm text-zinc-400">
          Notification preferences are stored locally on this device. Use the
          actions below to manage read and dismissed alert states.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="secondary" onClick={handleMarkAllRead}>
            Mark All as Read
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleDismissVisible}
          >
            Dismiss Visible Alerts
          </Button>
          <Button type="button" variant="secondary" onClick={handleResetPreferences}>
            Reset Preferences
          </Button>
        </div>
      </div>
    </SettingsPanelShell>
  );
}
