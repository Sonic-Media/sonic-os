-- Production data protection: soft deletes and backup tracking.
-- Apply via `prisma migrate deploy` only — never drop/recreate tables in production.

ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "ExpenseRecord" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Staff_deletedAt_idx" ON "Staff"("deletedAt");
CREATE INDEX IF NOT EXISTS "Product_deletedAt_idx" ON "Product"("deletedAt");
CREATE INDEX IF NOT EXISTS "StockMovement_deletedAt_idx" ON "StockMovement"("deletedAt");
CREATE INDEX IF NOT EXISTS "Sale_deletedAt_idx" ON "Sale"("deletedAt");
CREATE INDEX IF NOT EXISTS "ExpenseRecord_deletedAt_idx" ON "ExpenseRecord"("deletedAt");

CREATE TABLE IF NOT EXISTS "BackupRecord" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" TEXT NOT NULL,
    "createdById" TEXT,
    "createdByName" TEXT,
    "manifestPath" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSizeBytes" BIGINT,
    "compressed" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "error" TEXT,

    CONSTRAINT "BackupRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BackupRecord_createdAt_idx" ON "BackupRecord"("createdAt");
CREATE INDEX IF NOT EXISTS "BackupRecord_status_idx" ON "BackupRecord"("status");
CREATE INDEX IF NOT EXISTS "BackupRecord_trigger_idx" ON "BackupRecord"("trigger");
