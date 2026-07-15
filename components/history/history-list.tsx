"use client";

import { HistoryCard } from "@/components/history/history-card";
import type { Entry } from "@/types";

interface HistoryListProps {
  entries: Entry[];
  onDelete: (entry: Entry) => void;
}

export function HistoryList({ entries, onDelete }: HistoryListProps) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <HistoryCard key={entry.id} entry={entry} onDelete={onDelete} />
      ))}
    </div>
  );
}
