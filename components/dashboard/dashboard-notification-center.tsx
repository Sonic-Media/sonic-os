"use client";

import {
  NotificationBell,
  NotificationCenterDrawer,
} from "@/components/dashboard/notifications/notification-center";
import { useNotificationCenter } from "@/hooks/use-notification-center";

export function DashboardNotificationCenter() {
  const {
    isOpen,
    open,
    close,
    activeTab,
    setActiveTab,
    filteredNotifications,
    unreadCount,
    markRead,
    markAllRead,
    clearAll,
  } = useNotificationCenter();

  return (
    <>
      <NotificationBell unreadCount={unreadCount} onClick={open} />
      <NotificationCenterDrawer
        isOpen={isOpen}
        onClose={close}
        notifications={filteredNotifications}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onClearAll={clearAll}
      />
    </>
  );
}
