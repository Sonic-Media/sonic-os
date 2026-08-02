import { BranchBadge } from "@/components/shared/layout/branch-badge";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  showBranchBadge?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  children,
  className,
  showBranchBadge = false,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-8", className)}>
      {title && (
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          {showBranchBadge ? <BranchBadge /> : null}
        </div>
      )}
      {subtitle && (
        <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
      )}
      {children}
    </header>
  );
}
