import { Card } from "@/components/shared/ui/card";

export function ReportsEmptyState() {
  return (
    <Card className="text-center py-12">
      <p className="text-zinc-500 text-sm">No data for this period yet.</p>
      <p className="text-zinc-600 text-xs mt-1">
        Add entries to see charts and reports.
      </p>
    </Card>
  );
}
