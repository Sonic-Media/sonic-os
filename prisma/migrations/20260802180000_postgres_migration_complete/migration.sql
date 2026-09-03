-- Repair incomplete init migration metadata (skip when table is absent, e.g. shadow DB)
DO $$
BEGIN
  IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
    UPDATE "_prisma_migrations"
    SET finished_at = started_at,
        logs = COALESCE(logs, '')
    WHERE migration_name = '20260802100000_init'
      AND finished_at IS NULL;
  END IF;
END $$;

CREATE TABLE "DayClosing" (
    "id" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "branchId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "metrics" JSONB NOT NULL,
    "staffPayouts" JSONB NOT NULL,
    "expectedCash" INTEGER NOT NULL DEFAULT 0,
    "actualCashCounted" INTEGER NOT NULL DEFAULT 0,
    "cashDifference" INTEGER NOT NULL DEFAULT 0,
    "cashStatus" TEXT NOT NULL DEFAULT 'balanced',
    "reconciliationNotes" TEXT,
    "summary" JSONB NOT NULL,
    "closedBy" TEXT,
    "closedByName" TEXT,
    "closedAt" TIMESTAMP(3),
    "reopenedBy" TEXT,
    "reopenedByName" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "closingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayClosing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLogEntry" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "recordId" TEXT,
    "detail" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityLog" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DayClosing_branchId_date_key" ON "DayClosing"("branchId", "date");
CREATE INDEX "DayClosing_branchId_idx" ON "DayClosing"("branchId");
CREATE INDEX "DayClosing_date_idx" ON "DayClosing"("date");
CREATE INDEX "DayClosing_status_idx" ON "DayClosing"("status");

CREATE INDEX "AuditLogEntry_branchCode_idx" ON "AuditLogEntry"("branchCode");
CREATE INDEX "AuditLogEntry_module_idx" ON "AuditLogEntry"("module");
CREATE INDEX "AuditLogEntry_action_idx" ON "AuditLogEntry"("action");
CREATE INDEX "AuditLogEntry_timestamp_idx" ON "AuditLogEntry"("timestamp");
CREATE INDEX "AuditLogEntry_userId_idx" ON "AuditLogEntry"("userId");
CREATE INDEX "AuditLogEntry_branchCode_timestamp_idx" ON "AuditLogEntry"("branchCode", "timestamp");

CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
CREATE INDEX "ActivityLog_type_idx" ON "ActivityLog"("type");

ALTER TABLE "DayClosing" ADD CONSTRAINT "DayClosing_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
