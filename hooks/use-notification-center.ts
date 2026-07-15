"use client";

import { useCallback, useMemo, useState } from "react";
import { useEntriesContext } from "@/context/entries-context";
import { useSettings } from "@/context/settings-context";
import { clearActivityRecords } from "@/lib/activity-log";
import {
  dismissNotifications,
  getNotificationPreferences,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-storage";
import {
  applyNotificationPreferences,
  filterNotificationsByTab,
  generateBusinessNotifications,
  getUnreadCount,
  type NotificationFilterTab,
} from "@/lib/notifications";

export function useNotificationCenter() {
  const { entries } = useEntriesContext();
  const { branches, settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationFilterTab>("all");
  const [preferences, setPreferences] = useState(getNotificationPreferences);

  const generatedNotifications = useMemo(
    () =>
      generateBusinessNotifications({
        entries,
        branches,
        branchNames: settings.branchNames,
      }),
    [entries, branches, settings.branchNames]
  );

  const notifications = useMemo(
    () => applyNotificationPreferences(generatedNotifications, preferences),
    [generatedNotifications, preferences]
  );

  const filteredNotifications = useMemo(
    () => filterNotificationsByTab(notifications, activeTab),
    [notifications, activeTab]
  );

  const unreadCount = useMemo(
    () => getUnreadCount(notifications),
    [notifications]
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((current) => !current), []);

  const markRead = useCallback((id: string) => {
    setPreferences(markNotificationRead(id));
  }, []);

  const markAllRead = useCallback(() => {
    setPreferences(
      markAllNotificationsRead(notifications.map((notification) => notification.id))
    );
  }, [notifications]);

  const clearAll = useCallback(() => {
    const ids = notifications.map((notification) => notification.id);
    setPreferences(dismissNotifications(ids));
    clearActivityRecords();
  }, [notifications]);

  const dismissVisible = useCallback(() => {
    const ids = filteredNotifications.map((notification) => notification.id);
    setPreferences(dismissNotifications(ids));
  }, [filteredNotifications]);

  return {
    isOpen,
    open,
    close,
    toggle,
    activeTab,
    setActiveTab,
    notifications,
    filteredNotifications,
    unreadCount,
    markRead,
    markAllRead,
    clearAll,
    dismissVisible,
  };
}
