"use client";

import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  children: React.ReactElement;
  className?: string;
  refreshKey?: string;
  dimmed?: boolean;
  footer?: React.ReactNode;
}

export function ChartContainer({
  children,
  className,
  refreshKey,
  dimmed = false,
  footer,
}: ChartContainerProps) {
  return (
    <div
      key={refreshKey}
      className={cn(
        "w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
        dimmed && "opacity-40",
        className
      )}
    >
      <div className="h-56 w-full transition-opacity duration-200 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
      {footer}
    </div>
  );
}
