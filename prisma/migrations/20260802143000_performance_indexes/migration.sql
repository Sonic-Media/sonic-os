-- Performance indexes for common filters and sort orders

CREATE INDEX "DailyOperation_timestamp_idx" ON "DailyOperation"("timestamp");
CREATE INDEX "DailyOperation_branchId_date_timestamp_idx" ON "DailyOperation"("branchId", "date", "timestamp");

CREATE INDEX "ExpenseRecord_createdAt_idx" ON "ExpenseRecord"("createdAt");
CREATE INDEX "ExpenseRecord_branchId_date_createdAt_idx" ON "ExpenseRecord"("branchId", "date", "createdAt");

CREATE INDEX "StaffPayment_createdAt_idx" ON "StaffPayment"("createdAt");

CREATE INDEX "StockMovement_date_createdAt_idx" ON "StockMovement"("date", "createdAt");
CREATE INDEX "StockMovement_branchId_date_idx" ON "StockMovement"("branchId", "date");

CREATE INDEX "Sale_branchId_status_date_idx" ON "Sale"("branchId", "status", "date");

CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

CREATE INDEX "AuthAuditLog_branchCode_createdAt_idx" ON "AuthAuditLog"("branchCode", "createdAt");

CREATE INDEX "Product_categoryId_status_idx" ON "Product"("categoryId", "status");
