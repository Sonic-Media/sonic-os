"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useSettings } from "@/context/settings-context";
import {
  SETTINGS_NAV_ITEMS,
  type SettingsSectionId,
} from "@/lib/settings/sections";

export function useSettingsPage() {
  const {
    isLoaded: settingsLoaded,
    loadError: settingsLoadError,
  } = useSettings();
  const { isLoaded: authLoaded, canManageUsers } = useAuth();
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("profile");

  const isLoaded = settingsLoaded && authLoaded;

  const navItems = useMemo(
    () =>
      SETTINGS_NAV_ITEMS.filter((item) => {
        if (item.id === "data-backup") {
          return canManageUsers;
        }
        return true;
      }),
    [canManageUsers]
  );

  const resolvedSection = useMemo(() => {
    if (navItems.some((item) => item.id === activeSection)) {
      return activeSection;
    }
    return navItems[0]?.id ?? "profile";
  }, [activeSection, navItems]);

  const activeNavItem = useMemo(
    () =>
      navItems.find((item) => item.id === resolvedSection) ?? navItems[0]!,
    [resolvedSection, navItems]
  );

  return {
    isLoaded,
    settingsLoadError,
    activeSection: resolvedSection,
    setActiveSection,
    navItems,
    activeNavItem,
    canManageUsers,
  };
}
