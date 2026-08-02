import { spawn } from "node:child_process";
import fs from "node:fs";
import type { ParsedDatabaseUrl } from "@/lib/backup/database-url";

export interface ExportSqlOptions {
  connection: ParsedDatabaseUrl;
  outputPath: string;
  pgDumpPath: string;
}

export async function exportDatabaseSql(
  options: ExportSqlOptions
): Promise<void> {
  const { connection, outputPath, pgDumpPath } = options;

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
      "--format=plain",
      "--no-owner",
      "--no-privileges",
      "--file",
      outputPath,
    ];

    const child = spawn(pgDumpPath, args, {
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
          `Failed to run ${pgDumpPath}. Install PostgreSQL client tools or set PG_DUMP_PATH. ${error.message}`
        )
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }

        reject(
          new Error(
            stderr.trim() ||
              `${pgDumpPath} exited with code ${code ?? "unknown"}.`
          )
        );
        return;
      }

      resolve();
    });
  });
}
