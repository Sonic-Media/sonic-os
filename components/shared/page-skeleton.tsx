import { PageContainer } from "@/components/shared/layout/page-container";

type PageSkeletonVariant = "dashboard" | "default";

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
}

export function PageSkeleton({ variant = "default" }: PageSkeletonProps) {
  return (
    <PageContainer>
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-zinc-900 rounded-xl" />
        {variant === "dashboard" ? (
          <>
            <div className="h-16 bg-zinc-900 rounded-2xl" />
            <div className="h-10 bg-zinc-900 rounded-xl" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="h-28 bg-zinc-900 rounded-2xl" />
              <div className="h-28 bg-zinc-900 rounded-2xl" />
              <div className="h-28 bg-zinc-900 rounded-2xl" />
              <div className="h-28 bg-zinc-900 rounded-2xl col-span-2 sm:col-span-1" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="h-32 bg-zinc-900 rounded-2xl" />
              <div className="h-32 bg-zinc-900 rounded-2xl" />
            </div>
          </>
        ) : (
          <div className="h-48 bg-zinc-900 rounded-2xl" />
        )}
      </div>
    </PageContainer>
  );
}
