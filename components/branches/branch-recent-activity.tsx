import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import type { BranchActivityItem } from "@/types/branch";

interface BranchRecentActivityProps {
  activity: BranchActivityItem[];
}

function formatActivityAmount(item: BranchActivityItem): string {
  if (item.amount === undefined) return "—";
  if (item.type === "movement") {
    return `${item.amount.toLocaleString("en-UG")} units`;
  }
  return formatCurrency(item.amount);
}

function formatActivityTime(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;

  return parsed.toLocaleString("en-UG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BranchRecentActivity({ activity }: BranchRecentActivityProps) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        Recent Activity
      </h2>
      <Card>
        {activity.length === 0 ? (
          <p className="text-sm text-zinc-500">No recent branch activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {activity.map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className="flex items-start justify-between gap-3 border-b border-zinc-800/60 pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {formatActivityTime(item.timestamp)}
                  </p>
                </div>
                <p className="text-sm font-medium text-zinc-300 tabular-nums">
                  {formatActivityAmount(item)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
