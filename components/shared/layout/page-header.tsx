import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-8", className)}>
      {title && (
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {title}
        </h1>
      )}
      {subtitle && (
        <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
      )}
      {children}
    </header>
  );
}
