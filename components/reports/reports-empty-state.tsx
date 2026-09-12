import { Card } from "@/components/shared/ui/card";

export function ReportsEmptyState() {
  return (
    <Card className="text-center py-12">
      <p className="text-zinc-500 text-sm">No chart data for this period.</p>
      <p className="text-zinc-600 text-xs mt-1">
        Totals above reflect UGX 0 when no completed operations were recorded.
      </p>
    </Card>
  );
}
