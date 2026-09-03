import { DATE_FORMATS, DEFAULT_APP_SETTINGS, PERIOD_LABELS } from "@/lib/constants";
import type { ReportPeriod } from "@/types";

const currencyFormatter = new Intl.NumberFormat(DATE_FORMATS.currency, {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return `UGX ${currencyFormatter.format(amount)}`;
}

export function formatChartAxisValue(value: number): string {
  if (value >= 1_000_000) {
    return `UGX ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `UGX ${(value / 1000).toFixed(0)}k`;
  }
  return `UGX ${value}`;
}

export function getGreeting(name = DEFAULT_APP_SETTINGS.ownerName): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good Morning, ${name}`;
  if (hour < 17) return `Good Afternoon, ${name}`;
  return `Good Evening, ${name}`;
}

export function getPeriodLabel(period: ReportPeriod): string {
  return PERIOD_LABELS[period];
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatRelativeTime(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return "Just now";

  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatNotificationTime(isoDate: string): string {
  const date = new Date(isoDate);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return "Just now";

  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - timestamp) / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `Today ${date.toLocaleTimeString("en-UG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString("en-UG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  return formatRelativeTime(isoDate);
}

export function formatLastLogin(isoDate: string | null | undefined): string {
  if (!isoDate?.trim()) {
    return "Never";
  }

  const date = new Date(isoDate);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) {
    return "Never";
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `Today ${date.toLocaleTimeString("en-UG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  const days = Math.floor((now.getTime() - timestamp) / (1000 * 60 * 60 * 24));
  if (days >= 1) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return formatRelativeTime(isoDate);
}
