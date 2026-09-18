"use client";

import Link from "next/link";
import { StaffServiceIcon } from "@/lib/staff-home/icons";
import type { StaffHomeActivityItem } from "@/lib/staff-home/activity";
import type { StaffServiceId } from "@/lib/staff-home/services";
import { cn } from "@/lib/utils";

function ActivityIcon({ kind }: { kind: StaffHomeActivityItem["kind"] }) {
  if (
    kind === "movies" ||
    kind === "accessories" ||
    kind === "services" ||
    kind === "printing" ||
    kind === "windows" ||
    kind === "other"
  ) {
    return <StaffServiceIcon name={kind as StaffServiceId} className="h-4 w-4" />;
  }

  if (kind === "expense") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.8l.9.7c1.2.9 3.1.9 4.2 0 1.2-.9 1.2-2.3 0-3.2-.9-.7-2.1-1-3-.7M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  if (kind === "shop-open" || kind === "shop-close") {
    return (
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          kind === "shop-open" ? "bg-emerald-400" : "bg-zinc-400"
        )}
      />
    );
  }

  return <span className="h-2 w-2 rounded-full bg-zinc-500" />;
}

interface ActivityFeedProps {
  items: StaffHomeActivityItem[];
  viewAllHref?: string;
  className?: string;
}

export function ActivityFeed({
  items,
  viewAllHref = "/sales",
  className,
}: ActivityFeedProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[rgba(16,18,30,0.95)] to-[rgba(8,10,18,0.9)] p-5 sm:p-6",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Today&apos;s Activity
        </p>
        <Link
          href={viewAllHref}
          className="text-xs font-medium text-sky-400 transition-colors hover:text-sky-300"
        >
          View All
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-zinc-500">No activity recorded yet today.</p>
      ) : (
        <ul className="mt-5 space-y-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-white/[0.02]"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-400 ring-1 ring-white/[0.06]">
                <ActivityIcon kind={item.kind} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs tabular-nums text-zinc-500">{item.time}</p>
                <p className="mt-0.5 truncate text-sm font-medium text-white">
                  {item.title}
                </p>
              </div>
              {item.amountLabel ? (
                <p className="shrink-0 text-sm font-semibold tabular-nums text-white">
                  {item.amountLabel}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
