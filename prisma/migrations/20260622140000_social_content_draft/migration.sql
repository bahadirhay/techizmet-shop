CREATE TABLE IF NOT EXISTS "shop"."social_content_draft" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'post',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" TEXT,
    "caption" TEXT,
    "hook" TEXT,
    "script" TEXT,
    "body" TEXT,
    "hashtagsJson" TEXT,
    "cta" TEXT,
    "productUrl" TEXT,
    "mediaUrlsJson" TEXT,
    "aiProvider" TEXT,
    "publishedUrl" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_content_draft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "social_content_draft_siteId_productId_platform_key" ON "shop"."social_content_draft"("siteId", "productId", "platform");
CREATE INDEX IF NOT EXISTS "social_content_draft_siteId_status_idx" ON "shop"."social_content_draft"("siteId", "status");
CREATE INDEX IF NOT EXISTS "social_content_draft_siteId_productId_idx" ON "shop"."social_content_draft"("siteId", "productId");

DO $$ BEGIN
  ALTER TABLE "shop"."social_content_draft"
    ADD CONSTRAINT "social_content_draft_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "shop"."social_content_draft"
    ADD CONSTRAINT "social_content_draft_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "shop"."product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
