-- Persist backup payloads in PostgreSQL for serverless (Vercel) where /tmp is ephemeral.

ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "storageType" TEXT NOT NULL DEFAULT 'filesystem';
ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "payload" BYTEA;
ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "manifestJson" JSONB;

CREATE INDEX IF NOT EXISTS "BackupRecord_storageType_idx" ON "BackupRecord"("storageType");
