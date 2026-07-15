"use client";

import { cn } from "@/lib/utils";

interface InsightCardProps {
  label: string;
  value: string;
  detail?: string;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "accent";
}

export function InsightCard({
  label,
  value,
  detail,
  onClick,
  className,
  variant = "default",
}: InsightCardProps) {
  const content = (
    <>
      <p
        className={cn(
          "text-sm font-medium tracking-wide",
          variant === "default" ? "text-zinc-500" : "text-zinc-600"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight",
          variant === "default" ? "text-white" : "text-black"
        )}
      >
        {value}
      </p>
      {detail && (
        <p
          className={cn(
            "mt-1 text-sm",
            variant === "default" ? "text-zinc-500" : "text-zinc-600"
          )}
        >
          {detail}
        </p>
      )}
    </>
  );

  if (!onClick) {
    return (
      <div
        className={cn(
          "rounded-2xl border p-5",
          variant === "default"
            ? "border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20"
            : "border-white/10 bg-white text-black shadow-xl shadow-white/5",
          className
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full cursor-pointer rounded-2xl border p-5 text-left",
        "transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:scale-[1.01]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        variant === "default"
          ? "border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20 hover:border-zinc-700/80 hover:bg-zinc-900/75"
          : "border-white/10 bg-white text-black shadow-xl shadow-white/5 hover:bg-zinc-100",
        className
      )}
    >
      {content}
    </button>
  );
}
