import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "accent";
}

export function Card({ children, className, variant = "default" }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-colors",
        variant === "default" && "border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20",
        variant === "elevated" &&
          "border-zinc-700/50 bg-zinc-900/80 shadow-xl shadow-black/30",
        variant === "accent" &&
          "border-white/10 bg-white text-black shadow-xl shadow-white/5",
        className
      )}
    >
      {children}
    </div>
  );
}
