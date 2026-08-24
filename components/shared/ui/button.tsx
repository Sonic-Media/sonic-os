import Link from "next/link";
import { cn } from "@/lib/utils";
import { uiInteraction, uiRadius } from "@/lib/ui/design-tokens";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "lg";
  href?: string;
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "default",
  href,
  loading = false,
  loadingLabel,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const classes = cn(
    uiInteraction.button,
    size === "default" && cn("h-11 px-5 text-sm", uiRadius.sm),
    size === "lg" && cn("h-14 px-8 text-base", uiRadius.md),
    variant === "primary" &&
      "bg-white text-black shadow-lg shadow-white/10 hover:bg-zinc-100",
    variant === "secondary" &&
      "border border-zinc-700 bg-zinc-900 text-white hover:border-zinc-600 hover:bg-zinc-800",
    variant === "ghost" &&
      "bg-transparent text-zinc-400 hover:bg-zinc-900/50 hover:text-white",
    !isDisabled && variant === "primary" && "hover:scale-[1.01]",
    className
  );

  const content = loading ? (loadingLabel ?? children) : children;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={isDisabled} {...props}>
      {content}
    </button>
  );
}
