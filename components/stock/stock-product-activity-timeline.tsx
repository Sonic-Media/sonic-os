import { StockEmptyState } from "@/components/stock/stock-empty-state";
import { Card } from "@/components/shared/ui/card";
import { cn } from "@/lib/utils";
import type { StockProductTimelineEvent } from "@/types/stock";

interface StockProductActivityTimelineProps {
  events: StockProductTimelineEvent[];
}

const EVENT_STYLES: Record<
  StockProductTimelineEvent["type"],
  { dot: string; label: string }
> = {
  created: { dot: "bg-blue-400", label: "text-blue-400" },
  "stock-in": { dot: "bg-emerald-400", label: "text-emerald-400" },
  "stock-out": { dot: "bg-red-400", label: "text-red-400" },
  "price-change": { dot: "bg-amber-400", label: "text-amber-400" },
};

function formatEventDate(date: string): string {
  const parsed = new Date(date + "T12:00:00");
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function StockProductActivityTimeline({
  events,
}: StockProductActivityTimelineProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Activity Timeline
      </h2>

      {events.length === 0 ? (
        <StockEmptyState message="No activity recorded for this item yet." />
      ) : (
        <Card className="p-0">
          <ol className="divide-y divide-zinc-800/60">
            {events.map((event, index) => {
              const styles = EVENT_STYLES[event.type];

              return (
                <li key={event.id} className="relative px-5 py-4">
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                        styles.dot
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            styles.label
                          )}
                        >
                          {event.label}
                        </p>
                        <time className="text-xs text-zinc-500">
                          {formatEventDate(event.date)}
                        </time>
                      </div>
                      {event.detail && (
                        <p className="mt-1 text-sm text-zinc-400">
                          {event.detail}
                        </p>
                      )}
                      {event.quantity !== undefined && (
                        <p className="mt-1 text-xs text-zinc-500">
                          {event.quantity.toLocaleString("en-UG")} units
                        </p>
                      )}
                    </div>
                  </div>
                  {index < events.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-[1.35rem] top-8 w-px bg-zinc-800/80"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </section>
  );
}
