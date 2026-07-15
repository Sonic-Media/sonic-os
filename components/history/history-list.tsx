"use client";

import { HistoryCard } from "@/components/history/history-card";
import type { Entry } from "@/types";

interface HistoryListProps {
  entries: Entry[];
  onDelete: (entry: Entry) => void;
  onDuplicate: (entry: Entry) => void;
}

export function HistoryList({ entries, onDelete, onDuplicate }: HistoryListProps) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <HistoryCard
          key={entry.id}
          entry={entry}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  );
}
