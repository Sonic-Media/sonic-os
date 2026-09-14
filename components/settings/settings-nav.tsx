"use client";

import type { SettingsNavItem, SettingsSectionId } from "@/lib/settings/sections";
import { uiSurface, uiTypography } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

interface SettingsNavProps {
  items: SettingsNavItem[];
  activeSection: SettingsSectionId;
  onSelect: (section: SettingsSectionId) => void;
}

export function SettingsNav({
  items,
  activeSection,
  onSelect,
}: SettingsNavProps) {
  return (
    <nav
      className={cn(
        uiSurface.card,
        "flex flex-col gap-1 p-2 lg:sticky lg:top-6 lg:self-start"
      )}
      aria-label="Settings sections"
    >
      <p className={cn(uiTypography.sectionLabel, "px-3 pb-2 pt-1")}>
        Settings
      </p>
      {items.map((item) => {
        const isActive = item.id === activeSection;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "rounded-xl px-3 py-2.5 text-left transition-all duration-200",
              isActive
                ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/15 text-white ring-1 ring-indigo-500/30"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="block text-sm font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
