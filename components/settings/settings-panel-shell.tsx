"use client";

import { uiSpacing, uiSurface, uiTypography } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

interface SettingsPanelShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Skip the outer card wrapper when children bring their own surfaces. */
  bare?: boolean;
}

export function SettingsPanelShell({
  title,
  description,
  children,
  className,
  bare = false,
}: SettingsPanelShellProps) {
  return (
    <section className={cn(uiSpacing.stack, className)}>
      <header className="space-y-1">
        <h2 className={uiTypography.sectionTitle}>{title}</h2>
        {description ? (
          <p className={uiTypography.body}>{description}</p>
        ) : null}
      </header>
      {bare ? (
        children
      ) : (
        <div
          className={cn(uiSurface.card, uiSpacing.cardPadding, uiSpacing.stack)}
        >
          {children}
        </div>
      )}
    </section>
  );
}
