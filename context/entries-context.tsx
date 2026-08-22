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
import {
  bulkDeleteDailyOperationsApi,
  deleteDailyOperationApi,
  fetchDailyOperations,
  importDailyOperationsApi,
  upsertDailyOperationApi,
} from "@/lib/api/daily-operations";
import { useAuth } from "@/context/auth-context";
import {
  getDataSourceErrorMessage,
  loadFromApi,
  runOnApi,
} from "@/lib/data-source/context-api";
import { upsertEntryInList } from "@/lib/storage";
import type { Entry } from "@/types";

interface EntriesContextValue {
  entries: Entry[];
  isLoaded: boolean;
  loadError: string | null;
  refreshEntries: () => Promise<void>;
  upsertEntry: (entry: Entry) => Promise<Entry>;
  deleteEntry: (id: string) => void;
  importEntries: (entries: Entry[]) => Promise<Entry[]>;
  removeEntriesByIds: (ids: string[]) => number;
}

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoaded: authLoaded } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const entriesRef = useRef<Entry[]>([]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const refreshEntriesFromApi = useCallback(async () => {
    const loaded = await fetchDailyOperations();
    entriesRef.current = loaded;
    setEntries(loaded);
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    if (hasLoaded.current && !isAuthenticated) {
      entriesRef.current = [];
      setEntries([]);
      setLoadError(null);
      hasLoaded.current = false;
      setIsLoaded(true);
      return;
    }

    if (!isAuthenticated) {
      entriesRef.current = [];
      setEntries([]);
      setLoadError(null);
      hasLoaded.current = false;
      setIsLoaded(true);
      return;
    }

    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        try {
          await loadFromApi(() => refreshEntriesFromApi());
        } catch (error) {
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          setIsLoaded(true);
        }
      })();
    });
  }, [authLoaded, isAuthenticated, refreshEntriesFromApi]);

  const upsertEntry = useCallback(async (entry: Entry): Promise<Entry> => {
    return runOnApi(async () => {
      const saved = await upsertDailyOperationApi(entry);
      const next = upsertEntryInList(entriesRef.current, saved);
      entriesRef.current = next;
      setEntries(next);
      return saved;
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    void (async () => {
      try {
        await runOnApi(async () => {
          await deleteDailyOperationApi(id);
          const next = entriesRef.current.filter((entry) => entry.id !== id);
          entriesRef.current = next;
          setEntries(next);
        });
      } catch (error) {
        console.error(getDataSourceErrorMessage(error));
      }
    })();
  }, []);

  const importEntries = useCallback(async (imported: Entry[]): Promise<Entry[]> => {
    const saved = await runOnApi(async () => {
      const persisted = await importDailyOperationsApi(imported);
      let next = entriesRef.current;
      for (const entry of persisted) {
        next = upsertEntryInList(next, entry);
      }
      entriesRef.current = next;
      setEntries(next);
      return persisted;
    });

    return saved;
  }, []);

  const removeEntriesByIds = useCallback((ids: string[]): number => {
    if (ids.length === 0) return 0;

    const idSet = new Set(ids);
    const previous = entriesRef.current;
    const next = previous.filter((entry) => !idSet.has(entry.id));
    const removedCount = previous.length - next.length;

    if (removedCount === 0) return 0;

    void (async () => {
      try {
        await runOnApi(async () => {
          await bulkDeleteDailyOperationsApi(ids);
          entriesRef.current = next;
          setEntries(next);
        });
      } catch (error) {
        console.error(getDataSourceErrorMessage(error));
      }
    })();

    return removedCount;
  }, []);

  const value = useMemo(
    () => ({
      entries,
      isLoaded,
      loadError,
      refreshEntries: refreshEntriesFromApi,
      upsertEntry,
      deleteEntry,
      importEntries,
      removeEntriesByIds,
    }),
    [
      entries,
      isLoaded,
      loadError,
      refreshEntriesFromApi,
      upsertEntry,
      deleteEntry,
      importEntries,
      removeEntriesByIds,
    ]
  );

  return (
    <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>
  );
}

export function useEntriesContext() {
  const context = useContext(EntriesContext);
  if (!context) {
    throw new Error("useEntriesContext must be used within an EntriesProvider");
  }
  return context;
}
