import { Card } from "@/components/shared/ui/card";

interface StockEmptyStateProps {
  message: string;
  hint?: string;
}

export function StockEmptyState({ message, hint }: StockEmptyStateProps) {
  return (
    <Card className="text-center py-12">
      <p className="text-zinc-500 text-sm">{message}</p>
      {hint && <p className="text-zinc-600 text-xs mt-1">{hint}</p>}
    </Card>
  );
}
