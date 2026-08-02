"use client";

import {
  NotificationBell,
  NotificationCenterDrawer,
} from "@/components/dashboard/notifications/notification-center";
import { useNotificationCenter } from "@/hooks/use-notification-center";

export function AppNotificationCenter() {
  const {
    isOpen,
    open,
    close,
    activeTab,
    setActiveTab,
    filteredAlerts,
    unreadCount,
    markRead,
    markAllRead,
    dismissVisible,
  } = useNotificationCenter();

  return (
    <>
      <NotificationBell unreadCount={unreadCount} onClick={open} />
      <NotificationCenterDrawer
        isOpen={isOpen}
        onClose={close}
        alerts={filteredAlerts}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onDismissVisible={dismissVisible}
      />
    </>
  );
}
