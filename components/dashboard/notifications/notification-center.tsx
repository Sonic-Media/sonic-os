"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  formatUnreadBadge,
  getAlertEmoji,
  type AlertFilterTab,
  type DisplayAlert,
} from "@/lib/business-alerts";
import { formatNotificationTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTER_TABS: { id: AlertFilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "warning", label: "Warning" },
  { id: "info", label: "Information" },
];

interface NotificationCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: DisplayAlert[];
  activeTab: AlertFilterTab;
  onTabChange: (tab: AlertFilterTab) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismissVisible: () => void;
}

function NotificationItem({
  alert,
  onMarkRead,
}: {
  alert: DisplayAlert;
  onMarkRead: (id: string) => void;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border px-4 py-3 transition-colors duration-200",
        alert.isRead
          ? "border-zinc-800/60 bg-zinc-900/30"
          : "border-zinc-700/80 bg-zinc-900/60"
      )}
    >
      <button
        type="button"
        className="flex w-full items-start gap-3 text-left"
        onClick={() => onMarkRead(alert.id)}
      >
        <span aria-hidden className="mt-0.5 text-base leading-none">
          {getAlertEmoji(alert.tone)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-sm font-semibold text-white">{alert.title}</h4>
            {!alert.isRead ? (
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white" />
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            {alert.description}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {formatNotificationTime(alert.timestamp)}
          </p>
        </div>
      </button>
      {alert.action ? (
        <Link
          href={alert.action.href}
          onClick={() => onMarkRead(alert.id)}
          className="mt-3 inline-flex rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors duration-200 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
        >
          {alert.action.label}
        </Link>
      ) : null}
    </article>
  );
}

export function NotificationCenterDrawer({
  isOpen,
  onClose,
  alerts,
  activeTab,
  onTabChange,
  onMarkRead,
  onMarkAllRead,
  onDismissVisible,
}: NotificationCenterDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close notification center"
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Notification Center"
        className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-800/80 bg-zinc-950 shadow-2xl animate-in slide-in-from-right duration-200 ease-out"
      >
        <header className="shrink-0 border-b border-zinc-800/80 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">
                Notification Center
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                {alerts.length} {alerts.length === 1 ? "alert" : "alerts"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg px-2 py-1.5 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-white"
            >
              <span aria-hidden className="text-lg leading-none">
                ×
              </span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                  activeTab === tab.id
                    ? "bg-white text-black"
                    : "border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {alerts.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-zinc-400">No alerts</p>
              <p className="mt-1 text-xs text-zinc-600">
                Business alerts will appear here when attention is needed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <NotificationItem
                  key={alert.id}
                  alert={alert}
                  onMarkRead={onMarkRead}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-zinc-800/80 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={alerts.every((alert) => alert.isRead)}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors duration-200 hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark all as read
            </button>
            <button
              type="button"
              onClick={onDismissVisible}
              disabled={alerts.length === 0}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors duration-200 hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Dismiss visible
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  className?: string;
}

export function NotificationBell({
  unreadCount,
  onClick,
  className,
}: NotificationBellProps) {
  const badge = formatUnreadBadge(unreadCount);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        unreadCount > 0
          ? `Open notification center, ${unreadCount} unread`
          : "Open notification center"
      }
      className={cn(
        "relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-900/60 text-zinc-300 transition-[border-color,background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white",
        className
      )}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
        />
      </svg>
      {badge ? (
        <span className="absolute -right-1 -top-1 min-w-[1.125rem] rounded-full bg-white px-1 py-0.5 text-center text-[10px] font-bold leading-none text-black">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
