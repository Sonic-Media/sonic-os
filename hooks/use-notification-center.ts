"use client";

import { useCallback, useMemo, useState } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useStaff } from "@/context/staff-context";
import { useStock } from "@/context/stock-context";
import { useSettings } from "@/context/settings-context";
import {
  applyAlertPreferences,
  filterAlertsByTab,
  generateBusinessAlerts,
  getUnreadAlertCount,
  type AlertFilterTab,
} from "@/lib/business-alerts";
import {
  dismissNotifications,
  getNotificationPreferences,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-storage";

export function useNotificationCenter() {
  const { activeBranch } = useActiveBranch();
  const { getBranchName } = useSettings();
  const { products, movements } = useStock();
  const { sales, customers } = useSales();
  const { purchases } = usePurchasing();
  const { expenses } = useExpensesModule();
  const { staff } = useStaff();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AlertFilterTab>("all");
  const [preferences, setPreferences] = useState(getNotificationPreferences);

  const generatedAlerts = useMemo(
    () =>
      generateBusinessAlerts({
        activeBranch,
        branchName: getBranchName(activeBranch),
        products,
        movements,
        sales,
        customers,
        purchases,
        expenses,
        staff,
      }),
    [
      activeBranch,
      getBranchName,
      products,
      movements,
      sales,
      customers,
      purchases,
      expenses,
      staff,
    ]
  );

  const alerts = useMemo(
    () => applyAlertPreferences(generatedAlerts, preferences),
    [generatedAlerts, preferences]
  );

  const filteredAlerts = useMemo(
    () => filterAlertsByTab(alerts, activeTab),
    [alerts, activeTab]
  );

  const unreadCount = useMemo(() => getUnreadAlertCount(alerts), [alerts]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((current) => !current), []);

  const markRead = useCallback((id: string) => {
    setPreferences(markNotificationRead(id));
  }, []);

  const markAllRead = useCallback(() => {
    setPreferences(markAllNotificationsRead(alerts.map((alert) => alert.id)));
  }, [alerts]);

  const dismissVisible = useCallback(() => {
    const ids = filteredAlerts.map((alert) => alert.id);
    setPreferences(dismissNotifications(ids));
  }, [filteredAlerts]);

  return {
    isOpen,
    open,
    close,
    toggle,
    activeTab,
    setActiveTab,
    alerts,
    filteredAlerts,
    unreadCount,
    markRead,
    markAllRead,
    dismissVisible,
  };
}
