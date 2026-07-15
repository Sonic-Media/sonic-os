import { getActivityRecords } from "@/lib/activity-log";
import { getDashboardChartData } from "@/lib/chart-data";
import { getTodayISO } from "@/lib/dates";
import {
  filterEntriesByDate,
  getBranchEntryHref,
  getTodayBranchProgress,
} from "@/lib/entry-helpers";
import { formatCurrency } from "@/lib/format";
import { getDashboardAnalytics } from "@/lib/report-insights";
import type { Branch, BranchConfig, Entry } from "@/types";

export type NotificationTone = "success" | "warning" | "critical" | "info";
export type NotificationCategory = "business" | "staff" | "reports" | "system";
export type NotificationFilterTab =
  | "all"
  | "business"
  | "staff"
  | "reports"
  | "system";

export interface NotificationAction {
  label: string;
  href: string;
}

export interface BusinessNotification {
  id: string;
  category: NotificationCategory;
  tone: NotificationTone;
  title: string;
  description: string;
  timestamp: string;
  priority: number;
  action?: NotificationAction;
}

const TONE_EMOJI: Record<NotificationTone, string> = {
  success: "🟢",
  warning: "🟡",
  critical: "🔴",
  info: "🔵",
};

export function getNotificationEmoji(tone: NotificationTone): string {
  return TONE_EMOJI[tone];
}

function getLatestTimestamp(entries: Entry[], fallback = new Date()): string {
  if (entries.length === 0) return fallback.toISOString();

  const latest = entries.reduce((current, entry) => {
    const entryTime = new Date(entry.createdAt).getTime();
    return entryTime > current ? entryTime : current;
  }, 0);

  return latest > 0 ? new Date(latest).toISOString() : fallback.toISOString();
}

function pushNotification(
  notifications: BusinessNotification[],
  notification: BusinessNotification
) {
  notifications.push(notification);
}

export function generateBusinessNotifications(options: {
  entries: Entry[];
  branches: BranchConfig[];
  branchNames: Record<Branch, string>;
  today?: string;
}): BusinessNotification[] {
  const today = options.today ?? getTodayISO();
  const notifications: BusinessNotification[] = [];
  const analytics = getDashboardAnalytics(options.entries, "daily", {
    branchNames: options.branchNames,
    staff: [],
  });
  const chartData = getDashboardChartData(
    options.entries,
    "daily",
    options.branchNames
  );
  const todayEntries = filterEntriesByDate(options.entries, today);
  const todayProgress = getTodayBranchProgress(
    options.entries,
    today,
    options.branches
  );
  const timestamp = getLatestTimestamp(todayEntries);
  const dayKey = today;

  if (analytics.sales.trend.direction === "up") {
    pushNotification(notifications, {
      id: `sales-increased-${dayKey}`,
      category: "reports",
      tone: "success",
      title: "Sales increased",
      description: `Today's sales are up ${Math.round(analytics.sales.trend.percent)}% compared to yesterday.`,
      timestamp,
      priority: 80,
      action: { label: "View Report", href: "/reports" },
    });
  }

  if (analytics.savings.trend.direction === "up") {
    pushNotification(notifications, {
      id: `savings-improved-${dayKey}`,
      category: "reports",
      tone: "success",
      title: "Savings improved",
      description: `Net savings improved by ${Math.round(analytics.savings.trend.percent)}% compared to yesterday.`,
      timestamp,
      priority: 78,
      action: { label: "View Report", href: "/reports" },
    });
  }

  for (const item of todayProgress) {
    if (item.completed) {
      pushNotification(notifications, {
        id: `branch-submitted-${item.branch}-${dayKey}`,
        category: "business",
        tone: "success",
        title: "Branch submitted",
        description: `${item.name} completed today's entry.`,
        timestamp,
        priority: 85,
        action: {
          label: "Open Branch",
          href: item.entryId ? `/entry/${item.entryId}` : "/history",
        },
      });
    }
  }

  if (analytics.expenses.trend.direction === "up") {
    const driver = analytics.quickInsights.highestExpenseCategory;
    pushNotification(notifications, {
      id: `expenses-increased-${dayKey}`,
      category: "reports",
      tone: "warning",
      title: "Expenses increased",
      description: driver
        ? `Expenses rose ${Math.round(analytics.expenses.trend.percent)}% with ${driver.label} as the largest category.`
        : `Expenses rose ${Math.round(analytics.expenses.trend.percent)}% compared to yesterday.`,
      timestamp,
      priority: 90,
      action: { label: "View Report", href: "/reports" },
    });
  }

  if (analytics.profitMargin.trend.direction === "down") {
    pushNotification(notifications, {
      id: `profit-margin-decreased-${dayKey}`,
      category: "reports",
      tone: "warning",
      title: "Profit margin decreased",
      description: `Profit margin fell to ${Math.round(analytics.profitMargin.value)}% compared to the previous period.`,
      timestamp,
      priority: 88,
      action: { label: "View Report", href: "/reports" },
    });
  }

  if (chartData.branchComparison.length >= 2) {
    const sorted = [...chartData.branchComparison].sort(
      (a, b) => b.sales - a.sales
    );
    const leader = sorted[0];
    const laggard = sorted[sorted.length - 1];

    if (leader && laggard && leader.sales > laggard.sales && laggard.sales > 0) {
      const gapPercent = Math.round(
        ((leader.sales - laggard.sales) / leader.sales) * 100
      );
      if (gapPercent >= 10) {
        pushNotification(notifications, {
          id: `branch-sales-declined-${laggard.branch}-${dayKey}`,
          category: "reports",
          tone: "warning",
          title: "Branch sales declined",
          description: `${laggard.branch} is underperforming compared to ${leader.branch} today.`,
          timestamp,
          priority: 86,
          action: { label: "View History", href: "/history" },
        });
      }
    }
  }

  for (const item of todayProgress) {
    if (!item.completed) {
      pushNotification(notifications, {
        id: `branch-missing-entry-${item.branch}-${dayKey}`,
        category: "business",
        tone: "critical",
        title: "Entry missing",
        description: `${item.name} has not submitted today's entry.`,
        timestamp,
        priority: 100,
        action: {
          label: "Open Branch",
          href: getBranchEntryHref(item),
        },
      });
    }
  }

  if (analytics.savings.value < 0) {
    pushNotification(notifications, {
      id: `negative-savings-${dayKey}`,
      category: "business",
      tone: "critical",
      title: "Negative savings",
      description: `Today's net savings are ${formatCurrency(analytics.savings.value)}.`,
      timestamp,
      priority: 98,
      action: { label: "View Report", href: "/reports" },
    });
  }

  const highestExpense = analytics.quickInsights.highestExpenseCategory;
  if (
    highestExpense &&
    analytics.expenses.value > 0 &&
    highestExpense.amount / analytics.expenses.value >= 0.45
  ) {
    pushNotification(notifications, {
      id: `high-expenses-${dayKey}`,
      category: "reports",
      tone: "critical",
      title: "High expenses detected",
      description: `${highestExpense.label} accounts for ${formatCurrency(highestExpense.amount)} of today's spending.`,
      timestamp,
      priority: 92,
      action: { label: "View History", href: "/history" },
    });
  }

  if (notifications.length === 0 && todayEntries.length === 0) {
    pushNotification(notifications, {
      id: `no-entries-${dayKey}`,
      category: "business",
      tone: "info",
      title: "No entries yet",
      description: "Log today's sales and expenses to start receiving business updates.",
      timestamp: new Date().toISOString(),
      priority: 10,
      action: { label: "New Entry", href: "/operations/today" },
    });
  }

  for (const record of getActivityRecords()) {
    const category: NotificationCategory =
      record.type === "staff-added"
        ? "staff"
        : record.type === "template-updated"
          ? "system"
          : "system";

    pushNotification(notifications, {
      id: `activity-${record.id}`,
      category,
      tone: "info",
      title: record.title,
      description: record.description,
      timestamp: record.timestamp,
      priority: 40,
      action:
        record.type === "staff-added"
          ? { label: "View Staff", href: "/staff" }
          : record.type === "template-updated"
            ? { label: "Open Settings", href: "/settings" }
            : { label: "Open Settings", href: "/settings" },
    });
  }

  return notifications.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

export interface DisplayNotification extends BusinessNotification {
  isRead: boolean;
}

export function applyNotificationPreferences(
  notifications: BusinessNotification[],
  preferences: { readIds: string[]; dismissedIds: string[] }
): DisplayNotification[] {
  return notifications
    .filter((notification) => !preferences.dismissedIds.includes(notification.id))
    .map((notification) => ({
      ...notification,
      isRead: preferences.readIds.includes(notification.id),
    }))
    .sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}

export function filterNotificationsByTab(
  notifications: DisplayNotification[],
  tab: NotificationFilterTab
): DisplayNotification[] {
  if (tab === "all") return notifications;
  return notifications.filter((notification) => notification.category === tab);
}

export function getUnreadCount(notifications: DisplayNotification[]): number {
  return notifications.filter((notification) => !notification.isRead).length;
}

export function formatUnreadBadge(count: number): string {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return String(count);
}
