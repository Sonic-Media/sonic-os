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
import { useBranch } from "@/context/branch-context";
import {
  beginBranchScopedFetch,
  beginFetchGeneration,
  isCurrentFetchGeneration,
  resetBranchScopedFetchRefs,
  shouldSkipBranchScopedFetch,
} from "@/lib/context/branch-scoped-load";
import type { Branch } from "@/types";
import {
  getDataSourceErrorMessage,
  loadFromApi,
  runOnApi,
} from "@/lib/data-source/context-api";
import { upsertEntryInList } from "@/lib/storage";
import type { Entry } from "@/types";

export type RemoveEntriesByIdsResult = {
  success: boolean;
  removedCount: number;
  error?: string;
};

interface EntriesContextValue {
  entries: Entry[];
  isLoaded: boolean;
  loadError: string | null;
  refreshEntries: () => Promise<void>;
  upsertEntry: (entry: Entry) => Promise<Entry>;
  deleteEntry: (id: string) => void;
  importEntries: (entries: Entry[]) => Promise<Entry[]>;
  removeEntriesByIds: (ids: string[]) => Promise<RemoveEntriesByIdsResult>;
}

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoaded: authLoaded } = useAuth();
  const { activeBranch, isLoaded: branchLoaded } = useBranch();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const lastFetchedBranch = useRef<Branch | null>(null);
  const fetchGeneration = useRef(0);
  const entriesRef = useRef<Entry[]>([]);
  const removeEntriesInFlight = useRef(false);

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

    if (!isAuthenticated) {
      beginFetchGeneration(fetchGeneration);
      entriesRef.current = [];
      setEntries([]);
      setLoadError(null);
      resetBranchScopedFetchRefs(hasLoaded, lastFetchedBranch);
      setIsLoaded(true);
      return;
    }

    if (!branchLoaded) {
      setIsLoaded(false);
      return;
    }

    if (shouldSkipBranchScopedFetch(hasLoaded, lastFetchedBranch, activeBranch)) {
      return;
    }

    const branchChanged = beginBranchScopedFetch(
      hasLoaded,
      lastFetchedBranch,
      activeBranch
    );
    if (branchChanged) {
      entriesRef.current = [];
      setEntries([]);
      setLoadError(null);
      setIsLoaded(false);
    }

    const generation = beginFetchGeneration(fetchGeneration);

    queueMicrotask(() => {
      void (async () => {
        try {
          await loadFromApi(() => refreshEntriesFromApi());

          if (!isCurrentFetchGeneration(fetchGeneration, generation)) {
            return;
          }

          setLoadError(null);
        } catch (error) {
          if (!isCurrentFetchGeneration(fetchGeneration, generation)) {
            return;
          }

          entriesRef.current = [];
          setEntries([]);
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          if (isCurrentFetchGeneration(fetchGeneration, generation)) {
            setIsLoaded(true);
          }
        }
      })();
    });
  }, [authLoaded, isAuthenticated, branchLoaded, activeBranch, refreshEntriesFromApi]);

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

  const removeEntriesByIds = useCallback(
    async (ids: string[]): Promise<RemoveEntriesByIdsResult> => {
      if (ids.length === 0) {
        return { success: true, removedCount: 0 };
      }

      if (removeEntriesInFlight.current) {
        return {
          success: false,
          removedCount: 0,
          error: "An undo is already in progress.",
        };
      }

      const uniqueIds = [...new Set(ids)];

      removeEntriesInFlight.current = true;

      try {
        const deletedCount = await runOnApi(async () => {
          const response = await bulkDeleteDailyOperationsApi(uniqueIds);
          if (response.deleted !== uniqueIds.length) {
            throw new Error(
              `Expected to delete ${uniqueIds.length} records but deleted ${response.deleted}.`
            );
          }
          return response.deleted;
        });

        const idSet = new Set(uniqueIds);
        const next = entriesRef.current.filter((entry) => !idSet.has(entry.id));
        entriesRef.current = next;
        setEntries(next);

        return { success: true, removedCount: deletedCount };
      } catch (error) {
        return {
          success: false,
          removedCount: 0,
          error: getDataSourceErrorMessage(error),
        };
      } finally {
        removeEntriesInFlight.current = false;
      }
    },
    []
  );

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
