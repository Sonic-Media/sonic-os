import { DATE_FORMATS, DEFAULT_APP_SETTINGS, PERIOD_LABELS } from "@/lib/constants";
import type { ReportPeriod } from "@/types";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(DATE_FORMATS.currency, {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getGreeting(name = DEFAULT_APP_SETTINGS.ownerName): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good Morning ${name}`;
  if (hour < 17) return `Good Afternoon ${name}`;
  return `Good Evening ${name}`;
}

export function getPeriodLabel(period: ReportPeriod): string {
  return PERIOD_LABELS[period];
}
