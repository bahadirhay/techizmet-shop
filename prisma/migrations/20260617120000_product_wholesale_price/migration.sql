-- Toptan (B2B) fiyat alanı
ALTER TABLE "shop"."product" ADD COLUMN IF NOT EXISTS "wholesalePriceMinor" INTEGER;
