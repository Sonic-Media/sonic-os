import fs from "node:fs";
import path from "node:path";

export function formatBackupTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function createBackupBasename(database: string, timestamp = new Date()): string {
  const safeDatabase = database.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `sonic-os-${safeDatabase}-${formatBackupTimestamp(timestamp)}`;
}

export function resolveUniqueBackupPath(
  directory: string,
  basename: string,
  extension: string
): string {
  fs.mkdirSync(directory, { recursive: true });

  let suffix = "";
  let counter = 1;

  while (true) {
    const filename = `${basename}${suffix}${extension}`;
    const candidate = path.join(directory, filename);

    if (!fs.existsSync(candidate)) {
      return candidate;
    }

    suffix = `-${String(counter).padStart(3, "0")}`;
    counter += 1;
  }
}

export function resolveBackupInputPath(inputPath: string): string {
  const resolved = path.resolve(inputPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Backup file not found: ${resolved}`);
  }

  return resolved;
}

export function isCompressedBackup(filePath: string): boolean {
  return filePath.endsWith(".gz") || filePath.endsWith(".sql.gz");
}
