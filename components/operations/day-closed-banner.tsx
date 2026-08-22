"use client";

import { Card } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { useAuth } from "@/context/auth-context";
import { useDayClosing } from "@/context/day-closing-context";
import { canReopenDay } from "@/lib/day-closing/permissions";
import type { DayClosingRecord } from "@/types/day-closing";
import type { Branch } from "@/types";

interface DayClosedBannerProps {
  branch: Branch;
  record: DayClosingRecord;
}

function formatClosedTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DayClosedBanner({ branch, record }: DayClosedBannerProps) {
  const { session } = useAuth();
  const { reopenDay } = useDayClosing();

  async function handleReopen() {
    await reopenDay(branch, record.date);
  }

  return (
    <Card className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Today&apos;s Status
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-400">
            Closed Today
          </p>
          <p className="mt-3 text-sm text-zinc-400">
            Closed by{" "}
            <span className="text-white">{record.closedByName ?? "Unknown"}</span>
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Closed at{" "}
            <span className="text-white">{formatClosedTime(record.closedAt)}</span>
          </p>
        </div>

        {session && canReopenDay(session.role) && (
          <Button type="button" variant="secondary" onClick={handleReopen}>
            Reopen Day
          </Button>
        )}
      </div>
    </Card>
  );
}
