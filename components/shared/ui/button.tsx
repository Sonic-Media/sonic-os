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
      "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-400 hover:to-violet-400",
    variant === "secondary" &&
      "border border-white/[0.1] bg-white/[0.04] text-white hover:border-white/[0.16] hover:bg-white/[0.08]",
    variant === "ghost" &&
      "bg-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-white",
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
