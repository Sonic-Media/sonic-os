import { NOTIFICATIONS_STORAGE_KEY } from "@/lib/constants";

export interface NotificationPreferences {
  readIds: string[];
  dismissedIds: string[];
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  readIds: [],
  dismissedIds: [],
};

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      readIds: Array.isArray(parsed.readIds) ? parsed.readIds : [],
      dismissedIds: Array.isArray(parsed.dismissedIds)
        ? parsed.dismissedIds
        : [],
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveNotificationPreferences(
  preferences: NotificationPreferences
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(preferences));
}

export function markNotificationRead(id: string): NotificationPreferences {
  const current = getNotificationPreferences();
  if (current.readIds.includes(id)) return current;

  const next = {
    ...current,
    readIds: [...current.readIds, id],
  };
  saveNotificationPreferences(next);
  return next;
}

export function markAllNotificationsRead(ids: string[]): NotificationPreferences {
  const current = getNotificationPreferences();
  const next = {
    ...current,
    readIds: Array.from(new Set([...current.readIds, ...ids])),
  };
  saveNotificationPreferences(next);
  return next;
}

export function dismissNotification(id: string): NotificationPreferences {
  const current = getNotificationPreferences();
  const next = {
    readIds: current.readIds.includes(id)
      ? current.readIds
      : [...current.readIds, id],
    dismissedIds: current.dismissedIds.includes(id)
      ? current.dismissedIds
      : [...current.dismissedIds, id],
  };
  saveNotificationPreferences(next);
  return next;
}

export function dismissNotifications(ids: string[]): NotificationPreferences {
  const current = getNotificationPreferences();
  const next = {
    readIds: Array.from(new Set([...current.readIds, ...ids])),
    dismissedIds: Array.from(new Set([...current.dismissedIds, ...ids])),
  };
  saveNotificationPreferences(next);
  return next;
}

export function clearNotificationPreferences(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
}
