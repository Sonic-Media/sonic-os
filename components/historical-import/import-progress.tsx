import { Card } from "@/components/shared/ui/card";
import { cn } from "@/lib/utils";

interface ImportProgressProps {
  progress: number;
  isImporting: boolean;
}

export function ImportProgress({ progress, isImporting }: ImportProgressProps) {
  if (!isImporting && progress === 0) return null;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Import Progress
        </h3>
        <span className="text-sm font-medium text-white tabular-nums">
          {progress}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn(
            "h-full rounded-full bg-white transition-all duration-200",
            isImporting && "animate-pulse"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </Card>
  );
}
