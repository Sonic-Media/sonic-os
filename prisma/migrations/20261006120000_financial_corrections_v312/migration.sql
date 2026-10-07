-- v3.1.2: additive audit table for closed-day expenditure corrections,
-- close-request rejections, and single-day wipes. DayClosing.status remains
-- a free-form string; needs_correction is a new value, not a schema enum.

CREATE TABLE "FinancialCorrection" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "originalAmount" INTEGER,
    "newAmount" INTEGER,
    "originalDescription" TEXT,
    "newDescription" TEXT,
    "changedFields" TEXT[],
    "reason" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialCorrection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialCorrection_sourceType_sourceId_idx" ON "FinancialCorrection"("sourceType", "sourceId");
CREATE INDEX "FinancialCorrection_branchCode_businessDate_idx" ON "FinancialCorrection"("branchCode", "businessDate");
CREATE INDEX "FinancialCorrection_kind_idx" ON "FinancialCorrection"("kind");
CREATE INDEX "FinancialCorrection_createdAt_idx" ON "FinancialCorrection"("createdAt");
CREATE INDEX "FinancialCorrection_actorUserId_idx" ON "FinancialCorrection"("actorUserId");
