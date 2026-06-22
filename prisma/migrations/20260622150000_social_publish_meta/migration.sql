ALTER TABLE "shop"."social_content_draft" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "shop"."social_content_draft" ADD COLUMN IF NOT EXISTS "publishError" TEXT;
