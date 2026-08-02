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
import {
  loadRemoteOrLocal,
  runRemoteOrLocal,
} from "@/lib/data-source/context-api";
import { getEntries, saveEntries, upsertEntryInList } from "@/lib/storage";
import type { Entry } from "@/types";

interface EntriesContextValue {
  entries: Entry[];
  isLoaded: boolean;
  upsertEntry: (entry: Entry) => Entry;
  deleteEntry: (id: string) => void;
  importEntries: (entries: Entry[]) => Entry[];
  removeEntriesByIds: (ids: string[]) => number;
}

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasLoaded = useRef(false);
  const entriesRef = useRef<Entry[]>([]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        const loaded = await loadRemoteOrLocal({
          remote: () => fetchDailyOperations(),
          local: () => getEntries(),
        });

        entriesRef.current = loaded;
        setEntries(loaded);
        setIsLoaded(true);
      })();
    });
  }, []);

  const upsertEntry = useCallback((entry: Entry): Entry => {
    void (async () => {
      await runRemoteOrLocal({
        remote: async () => {
          const saved = await upsertDailyOperationApi(entry);
          const next = upsertEntryInList(entriesRef.current, saved);
          entriesRef.current = next;
          setEntries(next);
        },
        local: () => {
          const next = upsertEntryInList(entriesRef.current, entry);
          saveEntries(next);
          entriesRef.current = next;
          setEntries(next);
        },
      });
    })();

    return entry;
  }, []);

  const deleteEntry = useCallback((id: string) => {
    void (async () => {
      await runRemoteOrLocal({
        remote: async () => {
          await deleteDailyOperationApi(id);
          const next = entriesRef.current.filter((entry) => entry.id !== id);
          entriesRef.current = next;
          setEntries(next);
        },
        local: () => {
          const next = entriesRef.current.filter((entry) => entry.id !== id);
          saveEntries(next);
          entriesRef.current = next;
          setEntries(next);
        },
      });
    })();
  }, []);

  const importEntries = useCallback((imported: Entry[]): Entry[] => {
    void (async () => {
      await runRemoteOrLocal({
        remote: async () => {
          const saved = await importDailyOperationsApi(imported);
          let next = entriesRef.current;
          for (const entry of saved) {
            next = upsertEntryInList(next, entry);
          }
          entriesRef.current = next;
          setEntries(next);
        },
        local: () => {
          let next = entriesRef.current;
          for (const entry of imported) {
            next = upsertEntryInList(next, entry);
          }
          saveEntries(next);
          entriesRef.current = next;
          setEntries(next);
        },
      });
    })();

    return imported;
  }, []);

  const removeEntriesByIds = useCallback((ids: string[]): number => {
    if (ids.length === 0) return 0;

    const idSet = new Set(ids);
    const previous = entriesRef.current;
    const next = previous.filter((entry) => !idSet.has(entry.id));
    const removedCount = previous.length - next.length;

    if (removedCount === 0) return 0;

    void (async () => {
      await runRemoteOrLocal({
        remote: async () => {
          await bulkDeleteDailyOperationsApi(ids);
          entriesRef.current = next;
          setEntries(next);
        },
        local: () => {
          saveEntries(next);
          entriesRef.current = next;
          setEntries(next);
        },
      });
    })();

    return removedCount;
  }, []);

  const value = useMemo(
    () => ({
      entries,
      isLoaded,
      upsertEntry,
      deleteEntry,
      importEntries,
      removeEntriesByIds,
    }),
    [entries, isLoaded, upsertEntry, deleteEntry, importEntries, removeEntriesByIds]
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
