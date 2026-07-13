-- Sosyal içerik: Instagram performans metrikleri önbelleği (camelCase — Prisma uyumu)
ALTER TABLE "shop"."social_content_draft"
  ADD COLUMN IF NOT EXISTS "performanceJson" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'shop' AND table_name = 'social_content_draft' AND column_name = 'performance_json'
  ) THEN
    UPDATE "shop"."social_content_draft"
    SET "performanceJson" = COALESCE("performanceJson", performance_json)
    WHERE performance_json IS NOT NULL;
    ALTER TABLE "shop"."social_content_draft" DROP COLUMN performance_json;
  END IF;
END $$;
