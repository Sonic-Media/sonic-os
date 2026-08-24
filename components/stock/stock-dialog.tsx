"use client";

import { cn } from "@/lib/utils";
import { uiSurface } from "@/lib/ui/design-tokens";

interface StockDialogProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  footer?: React.ReactNode;
}

export function StockDialog({
  title,
  description,
  children,
  onClose,
  className,
  footer,
}: StockDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col",
          uiSurface.modal,
          className ?? "max-w-lg"
        )}
      >
        <div className="border-b border-zinc-800/80 px-6 py-5">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              {description}
            </p>
          )}
        </div>

        <div className="overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="border-t border-zinc-800/80 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function StockFieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="text-xs text-red-400">{message}</p>;
}
