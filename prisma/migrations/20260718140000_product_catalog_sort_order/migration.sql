-- /collections/all katalog sırası (ana sayfa sortOrder'dan bağımsız)
ALTER TABLE "shop"."product" ADD COLUMN IF NOT EXISTS "catalogSortOrder" INTEGER NOT NULL DEFAULT 0;

-- Mevcut ürünleri ada göre başlangıç sırasına koy
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "siteId" ORDER BY "title" ASC) - 1 AS rn
  FROM "shop"."product"
)
UPDATE "shop"."product" p
SET "catalogSortOrder" = ordered.rn
FROM ordered
WHERE p.id = ordered.id;

CREATE INDEX IF NOT EXISTS "product_siteId_published_catalogSortOrder_idx"
  ON "shop"."product"("siteId", "published", "catalogSortOrder");
