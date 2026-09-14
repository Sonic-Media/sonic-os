import { PageContainer } from "@/components/shared/layout/page-container";

type PageSkeletonVariant = "dashboard" | "default";

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
}

function SkeletonBlock({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-[14px] border border-white/[0.06] bg-[rgba(12,14,26,0.6)] ${className ?? ""}`}
    />
  );
}

export function PageSkeleton({ variant = "default" }: PageSkeletonProps) {
  return (
    <PageContainer>
      <div className="space-y-6 pb-10">
        {variant === "dashboard" ? (
          <>
            <SkeletonBlock className="h-44" />
            <SkeletonBlock className="h-56" />
            <SkeletonBlock className="h-48" />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
              <SkeletonBlock className="h-80" />
              <SkeletonBlock className="h-56" />
            </div>
            <SkeletonBlock className="h-[520px]" />
            <SkeletonBlock className="h-64" />
            <SkeletonBlock className="h-56" />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SkeletonBlock className="h-56" />
              <SkeletonBlock className="h-56" />
            </div>
          </>
        ) : (
          <SkeletonBlock className="h-48" />
        )}
      </div>
    </PageContainer>
  );
}
