-- AlterTable
ALTER TABLE "DayClosing" ADD COLUMN "openedBy" TEXT;
ALTER TABLE "DayClosing" ADD COLUMN "openedByName" TEXT;
ALTER TABLE "DayClosing" ADD COLUMN "openedAt" TIMESTAMP(3);
