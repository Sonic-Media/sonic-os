import { Card } from "@/components/shared/ui/card";

interface PurchasingEmptyStateProps {
  message: string;
}

export function PurchasingEmptyState({ message }: PurchasingEmptyStateProps) {
  return (
    <Card className="flex min-h-[160px] items-center justify-center text-center">
      <p className="text-sm text-zinc-500">{message}</p>
    </Card>
  );
}
