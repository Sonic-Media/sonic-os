import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ParsedDatabaseUrl } from "@/lib/backup/database-url";
import { decompressToFile } from "@/lib/backup/compress";
import { isCompressedBackup } from "@/lib/backup/paths";

export interface RestoreSqlOptions {
  connection: ParsedDatabaseUrl;
  inputPath: string;
  psqlPath: string;
}

async function runPsqlFile(
  connection: ParsedDatabaseUrl,
  sqlFilePath: string,
  psqlPath: string
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const args = [
      "--host",
      connection.host,
      "--port",
      connection.port,
      "--username",
      connection.user,
      "--dbname",
      connection.database,
      "--set",
      "ON_ERROR_STOP=1",
      "--file",
      sqlFilePath,
    ];

    const child = spawn(psqlPath, args, {
      env: {
        ...process.env,
        PGPASSWORD: connection.password,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(
        new Error(
          `Failed to run ${psqlPath}. Install PostgreSQL client tools or set PSQL_PATH. ${error.message}`
        )
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() ||
              `${psqlPath} exited with code ${code ?? "unknown"}.`
          )
        );
        return;
      }

      resolve();
    });
  });
}

export async function restoreDatabaseSql(
  options: RestoreSqlOptions
): Promise<{ sqlFilePath: string; temporaryFile: boolean }> {
  const { connection, inputPath, psqlPath } = options;
  const resolvedInput = path.resolve(inputPath);

  if (isCompressedBackup(resolvedInput)) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sonic-os-restore-"));
    const tempSqlPath = path.join(tempDir, "restore.sql");

    try {
      await decompressToFile(resolvedInput, tempSqlPath);
      await runPsqlFile(connection, tempSqlPath, psqlPath);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    return { sqlFilePath: resolvedInput, temporaryFile: false };
  }

  await runPsqlFile(connection, resolvedInput, psqlPath);
  return { sqlFilePath: resolvedInput, temporaryFile: false };
}
