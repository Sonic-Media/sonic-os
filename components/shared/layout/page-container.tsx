import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-lg px-5 pt-6 pb-28",
        "lg:max-w-[1500px] lg:px-8 lg:pt-8 lg:pb-8",
        className
      )}
    >
      {children}
    </div>
  );
}
