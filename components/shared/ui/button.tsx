import Link from "next/link";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "lg";
  href?: string;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "default",
  href,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
    size === "default" && "h-11 px-5 text-sm rounded-xl",
    size === "lg" && "h-14 px-8 text-base rounded-2xl",
    variant === "primary" &&
      "bg-white text-black hover:bg-zinc-100 shadow-lg shadow-white/10",
    variant === "secondary" &&
      "bg-zinc-900 text-white border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600",
    variant === "ghost" &&
      "bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/50",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
