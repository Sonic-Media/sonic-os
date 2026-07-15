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

  const value = useMemo(
    () => ({
      entries,
      isLoaded,
      upsertEntry,
      deleteEntry,
    }),
    [entries, isLoaded, upsertEntry, deleteEntry]
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
