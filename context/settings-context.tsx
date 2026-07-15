"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { APP_VERSION } from "@/lib/constants";
import {
  buildBranchConfigs,
  getSettings,
  normalizeSettings,
  saveSettings,
} from "@/lib/settings-storage";
import { recordActivity } from "@/lib/activity-log";
import type { AppSettings, Branch, BranchConfig } from "@/types";

interface SettingsContextValue {
  settings: AppSettings;
  branches: BranchConfig[];
  isLoaded: boolean;
  version: string;
  updateSettings: (patch: Partial<AppSettings>) => void;
  getBranchName: (branch: Branch) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [isLoaded, setIsLoaded] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      setSettings(getSettings());
      setIsLoaded(true);
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = normalizeSettings({ ...prev, ...patch });
      saveSettings(next);

      const changedKeys = Object.keys(patch);
      const isSignificant = changedKeys.some((key) =>
        ["businessName", "ownerName", "defaultLunchAmount"].includes(key)
      );

      if (isSignificant) {
        recordActivity({
          type: "settings-changed",
          title: "Settings changed",
          description: "Business or account settings were updated.",
        });
      }

      return next;
    });
  }, []);

  const branches = useMemo(
    () => buildBranchConfigs(settings.branchNames),
    [settings.branchNames]
  );

  const getBranchName = useCallback(
    (branch: Branch) => settings.branchNames[branch] ?? branch,
    [settings.branchNames]
  );

  const value = useMemo(
    () => ({
      settings,
      branches,
      isLoaded,
      version: APP_VERSION,
      updateSettings,
      getBranchName,
    }),
    [settings, branches, isLoaded, updateSettings, getBranchName]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
