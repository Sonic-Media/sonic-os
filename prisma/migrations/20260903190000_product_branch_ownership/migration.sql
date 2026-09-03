-- Branch-owned products: each product belongs to exactly one branch.

ALTER TABLE "Product" ADD COLUMN "branchId" UUID;

UPDATE "Product" AS p
SET "branchId" = (
  SELECT sm."branchId"
  FROM "StockMovement" AS sm
  WHERE sm."productId" = p.id
    AND sm."deletedAt" IS NULL
  ORDER BY sm."createdAt" ASC
  LIMIT 1
);

UPDATE "Product"
SET "branchId" = (
  SELECT b.id
  FROM "Branch" AS b
  WHERE b.code = 'salaama'
  LIMIT 1
)
WHERE "branchId" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "branchId" SET NOT NULL;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Product_sku_key";

CREATE UNIQUE INDEX "Product_branchId_sku_key" ON "Product"("branchId", "sku");

CREATE INDEX "Product_branchId_idx" ON "Product"("branchId");
CREATE INDEX "Product_branchId_status_idx" ON "Product"("branchId", "status");
