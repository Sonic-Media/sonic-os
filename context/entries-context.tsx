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

  const upsertEntry = useCallback((entry: Entry): Entry => {
    const next = upsertEntryInList(entriesRef.current, entry);
    saveEntries(next);
    entriesRef.current = next;
    setEntries(next);
    return entry;
  }, []);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      const loaded = getEntries();
      entriesRef.current = loaded;
      setEntries(loaded);
      setIsLoaded(true);
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      saveEntries(next);
      entriesRef.current = next;
      return next;
    });
  }, []);

  const importEntries = useCallback((imported: Entry[]): Entry[] => {
    let next = entriesRef.current;

    for (const entry of imported) {
      next = upsertEntryInList(next, entry);
    }

    saveEntries(next);
    entriesRef.current = next;
    setEntries(next);
    return imported;
  }, []);

  const removeEntriesByIds = useCallback((ids: string[]): number => {
    if (ids.length === 0) return 0;

    const idSet = new Set(ids);
    const previous = entriesRef.current;
    const next = previous.filter((entry) => !idSet.has(entry.id));
    const removedCount = previous.length - next.length;

    if (removedCount === 0) return 0;

    saveEntries(next);
    entriesRef.current = next;
    setEntries(next);
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
