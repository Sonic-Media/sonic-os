import { IMPORT_UNDO_STORAGE_KEY } from "@/lib/constants";
import {
  readLocalStorageJson,
  removeLocalStorageItem,
  writeLocalStorageItem,
} from "@/lib/safe-storage";
import type { ImportUndoSnapshot } from "@/types/historical-import";

export function getImportUndoSnapshot(): ImportUndoSnapshot | null {
  if (typeof window === "undefined") return null;

  const parsed = readLocalStorageJson<Partial<ImportUndoSnapshot> | null>(
    IMPORT_UNDO_STORAGE_KEY,
    null
  );
  if (!parsed || !Array.isArray(parsed.entryIds)) return null;

  return parsed as ImportUndoSnapshot;
}

export function saveImportUndoSnapshot(snapshot: ImportUndoSnapshot): void {
  if (typeof window === "undefined") return;
  writeLocalStorageItem(IMPORT_UNDO_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearImportUndoSnapshot(): void {
  removeLocalStorageItem(IMPORT_UNDO_STORAGE_KEY);
}
