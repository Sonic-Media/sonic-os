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
import { fetchSettings, updateSettingsApi } from "@/lib/api/settings";
import { useAuth } from "@/context/auth-context";
import { recordActivity } from "@/lib/activity-log";
import {
  getDataSourceErrorMessage,
  loadFromApi,
  runOnApi,
} from "@/lib/data-source/context-api";
import { APP_VERSION, DEFAULT_APP_SETTINGS } from "@/lib/constants";
import { buildBranchConfigs } from "@/lib/settings-storage";
import type { AppSettings, Branch, BranchConfig } from "@/types";

interface SettingsContextValue {
  settings: AppSettings;
  branches: BranchConfig[];
  isLoaded: boolean;
  loadError: string | null;
  version: string;
  updateSettings: (patch: Partial<AppSettings>) => void;
  getBranchName: (branch: Branch) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoaded: authLoaded } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const refreshSettingsFromApi = useCallback(async () => {
    const remoteSettings = await fetchSettings();
    setSettings(remoteSettings);
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    if (hasLoaded.current && !isAuthenticated) {
      setSettings(DEFAULT_APP_SETTINGS);
      setLoadError(null);
      setIsLoaded(true);
      return;
    }
    if (!isAuthenticated) {
      setSettings(DEFAULT_APP_SETTINGS);
      setLoadError(null);
      setIsLoaded(true);
      return;
    }
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        try {
          await loadFromApi(() => refreshSettingsFromApi());
        } catch (error) {
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          setIsLoaded(true);
        }
      })();
    });
  }, [authLoaded, isAuthenticated, refreshSettingsFromApi]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    void (async () => {
      try {
        const next = await runOnApi(() => updateSettingsApi(patch));
        setSettings(next);
        setLoadError(null);

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
      } catch (error) {
        console.error(getDataSourceErrorMessage(error));
      }
    })();
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
      loadError,
      version: APP_VERSION,
      updateSettings,
      getBranchName,
    }),
    [settings, branches, isLoaded, loadError, updateSettings, getBranchName]
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
