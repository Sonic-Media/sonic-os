import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

export function ReportsEmptyState() {
  return (
    <section className={cn(uiSurface.card, "px-5 py-12 text-center")}>
      <p className="text-sm text-zinc-500">No chart data for this period.</p>
      <p className="mt-1 text-xs text-zinc-600">
        Totals above reflect UGX 0 when no completed operations were recorded.
      </p>
    </section>
  );
}
