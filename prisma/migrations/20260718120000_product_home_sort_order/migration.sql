-- Ana sayfa ürün sırası (admin sürükle-bırak)
ALTER TABLE "shop"."product" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Mevcut ürünleri «en yeni önce» mantığıyla başlangıç sırasına koy (createdAt desc)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "siteId" ORDER BY "createdAt" DESC) - 1 AS rn
  FROM "shop"."product"
)
UPDATE "shop"."product" p
SET "sortOrder" = ordered.rn
FROM ordered
WHERE p.id = ordered.id;

CREATE INDEX IF NOT EXISTS "product_siteId_published_sortOrder_idx"
  ON "shop"."product"("siteId", "published", "sortOrder");
