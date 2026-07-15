import { Card } from "@/components/shared/ui/card";

export function HistoryEmptyState() {
  return (
    <Card className="text-center py-12">
      <p className="text-zinc-500 text-sm">No entries found.</p>
      <p className="text-zinc-600 text-xs mt-1">
        Try adjusting your filters or add a new entry.
      </p>
    </Card>
  );
}
