-- Sosyal içerik stüdyosu: AI brif ve görsel kaynağı
ALTER TABLE "shop"."social_content_draft"
  ADD COLUMN IF NOT EXISTS "creativeBriefJson" TEXT,
  ADD COLUMN IF NOT EXISTS "imagePrompt" TEXT,
  ADD COLUMN IF NOT EXISTS "mediaSource" TEXT;
