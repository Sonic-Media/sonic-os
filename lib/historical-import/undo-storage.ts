import { IMPORT_UNDO_STORAGE_KEY } from "@/lib/constants";
import type { ImportUndoSnapshot } from "@/types/historical-import";

export function getImportUndoSnapshot(): ImportUndoSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(IMPORT_UNDO_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ImportUndoSnapshot;
    if (!Array.isArray(parsed.entryIds)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function saveImportUndoSnapshot(snapshot: ImportUndoSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(IMPORT_UNDO_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearImportUndoSnapshot(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(IMPORT_UNDO_STORAGE_KEY);
}
