"use client";

import { Card } from "@/components/shared/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, children, className }: ChartCardProps) {
  return (
    <Card className={cn("!p-4", className)}>
      <p className="text-sm font-medium text-zinc-500 tracking-wide mb-4">
        {title}
      </p>
      {children}
    </Card>
  );
}

export const CHART_EMPTY_MESSAGE = (
  <>
    No analytics available yet.
    <br />
    Complete more entries to unlock insights.
  </>
);

interface ChartsEmptyStateProps {
  className?: string;
}

export function ChartsEmptyState({ className }: ChartsEmptyStateProps) {
  return (
    <Card className={cn("!p-4 mb-6", className)}>
      <p className="py-12 text-center text-sm leading-relaxed text-zinc-500">
        {CHART_EMPTY_MESSAGE}
      </p>
    </Card>
  );
}
