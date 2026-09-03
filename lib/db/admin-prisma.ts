import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/lib/prisma";
import {
  getPoolConfig,
  resolveDatabaseUrl,
} from "@/lib/db/connection";

/**
 * Raw Prisma client without soft-delete extension.
 * Use only for maintenance scripts that must hard-delete or count all rows.
 */
let adminClient: PrismaClient | undefined;
let adminPool: Pool | undefined;

export function getAdminPrismaClient(): PrismaClient {
  if (adminClient) {
    return adminClient;
  }

  const connectionString = resolveDatabaseUrl();
  adminPool = new Pool(getPoolConfig(connectionString));
  const adapter = new PrismaPg(adminPool);
  adminClient = new PrismaClient({
    adapter,
    log: ["error"],
  });

  return adminClient;
}

export async function disconnectAdminPrismaClient(): Promise<void> {
  if (adminClient) {
    await adminClient.$disconnect();
    adminClient = undefined;
  }

  if (adminPool) {
    await adminPool.end();
    adminPool = undefined;
  }
}

export function readBackupManifest(manifestPath: string): {
  createdAt: string;
  compressed: boolean;
  engine?: "pg_dump" | "json";
  files: { archive?: string; sql?: string; json?: string };
  sizes: { archiveBytes?: number; sqlBytes?: number; jsonBytes?: number };
} | null {
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    return JSON.parse(raw) as {
      createdAt: string;
      compressed: boolean;
      engine?: "pg_dump" | "json";
      files: { archive?: string; sql?: string; json?: string };
      sizes: { archiveBytes?: number; sqlBytes?: number; jsonBytes?: number };
    };
  } catch {
    return null;
  }
}

export function resolveBackupFileFromManifest(manifestPath: string): string | null {
  const manifest = readBackupManifest(manifestPath);
  if (!manifest) {
    return null;
  }

  const backupDir = path.dirname(manifestPath);
  const fileName =
    manifest.files.archive ?? manifest.files.sql ?? manifest.files.json;
  if (!fileName) {
    return null;
  }

  return path.join(backupDir, fileName);
}
