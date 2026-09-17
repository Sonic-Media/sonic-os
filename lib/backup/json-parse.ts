import { gunzipSync, gunzip } from "node:zlib";
import { promisify } from "node:util";
import type { JsonBackupPayload } from "@/lib/backup/json-export";
import {
  BackupValidationError,
  validateJsonBackupPayload,
} from "@/lib/backup/json-validate";

const gunzipAsync = promisify(gunzip);

function looksLikeGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/**
 * Decompress a .json.gz buffer or pass through plain JSON bytes.
 */
export async function decompressBackupBytes(
  bytes: Uint8Array,
  fileNameHint?: string
): Promise<Uint8Array> {
  const lower = (fileNameHint ?? "").toLowerCase();
  const shouldGunzip =
    lower.endsWith(".gz") || lower.endsWith(".json.gz") || looksLikeGzip(bytes);

  if (!shouldGunzip) {
    return bytes;
  }

  try {
    const result = await gunzipAsync(Buffer.from(bytes));
    return new Uint8Array(result);
  } catch (error) {
    throw new BackupValidationError(
      error instanceof Error
        ? `Could not decompress backup (corrupted gzip): ${error.message}`
        : "Could not decompress backup (corrupted gzip).",
      "corrupted_gzip"
    );
  }
}

export function decompressBackupBytesSync(
  bytes: Uint8Array,
  fileNameHint?: string
): Uint8Array {
  const lower = (fileNameHint ?? "").toLowerCase();
  const shouldGunzip =
    lower.endsWith(".gz") || lower.endsWith(".json.gz") || looksLikeGzip(bytes);

  if (!shouldGunzip) {
    return bytes;
  }

  try {
    return new Uint8Array(gunzipSync(Buffer.from(bytes)));
  } catch (error) {
    throw new BackupValidationError(
      error instanceof Error
        ? `Could not decompress backup (corrupted gzip): ${error.message}`
        : "Could not decompress backup (corrupted gzip).",
      "corrupted_gzip"
    );
  }
}

export function parseBackupJsonText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new BackupValidationError("Backup file is empty.", "empty_backup");
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch (error) {
    throw new BackupValidationError(
      error instanceof Error
        ? `Backup contains invalid JSON: ${error.message}`
        : "Backup contains invalid JSON.",
      "invalid_json"
    );
  }
}

/**
 * Full parse + validate pipeline for uploaded or stored backup bytes.
 * Never mutates application data.
 */
export async function parseAndValidateJsonBackup(
  bytes: Uint8Array,
  fileNameHint?: string
): Promise<JsonBackupPayload> {
  const decompressed = await decompressBackupBytes(bytes, fileNameHint);
  const text = decodeUtf8(decompressed);
  const parsed = parseBackupJsonText(text);
  return validateJsonBackupPayload(parsed);
}
