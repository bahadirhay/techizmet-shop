ALTER TABLE "shop"."stock_item" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "shop"."stock_item" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
CREATE INDEX IF NOT EXISTS "stock_item_siteId_barcode_idx" ON "shop"."stock_item"("siteId", "barcode");
