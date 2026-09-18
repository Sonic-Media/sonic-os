"use client";

import { formatClockTime } from "@/lib/staff/attendance";
import { cn } from "@/lib/utils";

export type ShopStatusState = "open" | "close_requested" | "closed";

interface ShopStatusCardProps {
  state: ShopStatusState;
  openedAt?: string | null;
  openedByName?: string | null;
  onOpenShop?: () => void;
  onCloseShop?: () => void;
  isOpening?: boolean;
  isClosing?: boolean;
  canOpen?: boolean;
  canClose?: boolean;
  error?: string | null;
  className?: string;
}

export function ShopStatusCard({
  state,
  openedAt,
  openedByName,
  onOpenShop,
  onCloseShop,
  isOpening = false,
  isClosing = false,
  canOpen = true,
  canClose = true,
  error,
  className,
}: ShopStatusCardProps) {
  const isOpen = state === "open";
  const isPending = state === "close_requested";

  return (
    <section
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[rgba(16,18,30,0.95)] to-[rgba(8,10,18,0.9)] p-5 sm:p-6",
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Shop Status
      </p>

      <div className="mt-5 flex items-start gap-3">
        <span
          className={cn(
            "mt-1 h-3 w-3 shrink-0 rounded-full",
            isOpen
              ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]"
              : isPending
                ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.55)]"
                : "bg-zinc-500"
          )}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-xl font-semibold tracking-tight text-white">
            {isOpen
              ? "Shop is Open"
              : isPending
                ? "Closing Requested"
                : "Shop is Closed"}
          </p>
          {isOpen || isPending ? (
            <div className="mt-2 space-y-1 text-sm text-zinc-400">
              {openedAt ? (
                <p>Opened at {formatClockTime(openedAt) || "—"}</p>
              ) : null}
              {openedByName ? <p>Opened by {openedByName}</p> : null}
              {isPending ? (
                <p className="text-amber-300/90">Awaiting management approval</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              Open the shop to start your shift and record today&apos;s work.
            </p>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-4 whitespace-pre-line text-sm text-red-400">{error}</p>
      ) : null}

      <div className="mt-6">
        {isOpen ? (
          <button
            type="button"
            onClick={onCloseShop}
            disabled={!canClose || isClosing}
            className={cn(
              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30",
              "bg-red-500/10 text-sm font-semibold text-red-200 transition-colors",
              "hover:bg-red-500/15 disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-red-400" aria-hidden />
            {isClosing ? "Closing…" : "Close Shop"}
          </button>
        ) : isPending ? (
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.08] px-4 py-3 text-sm text-indigo-200">
            Closing request sent. The shop stays open until approved.
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenShop}
            disabled={!canOpen || isOpening}
            className={cn(
              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl",
              "bg-gradient-to-r from-emerald-600 to-teal-600 text-sm font-semibold text-white",
              "shadow-[0_16px_40px_-16px_rgba(16,185,129,0.7)] transition-opacity",
              "hover:opacity-95 disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-200" aria-hidden />
            {isOpening ? "Opening…" : "Open Shop"}
          </button>
        )}
      </div>
    </section>
  );
}
