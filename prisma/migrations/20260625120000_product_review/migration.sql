CREATE TABLE IF NOT EXISTS "shop"."product_review" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorEmail" TEXT,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "source" TEXT NOT NULL DEFAULT 'customer',
  "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "product_review_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "product_review_siteId_status_createdAt_idx" ON "shop"."product_review"("siteId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "product_review_productId_status_idx" ON "shop"."product_review"("productId", "status");

DO $$ BEGIN
  ALTER TABLE "shop"."product_review"
    ADD CONSTRAINT "product_review_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "shop"."product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
