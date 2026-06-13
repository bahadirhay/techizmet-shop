-- Instagram vitrin gönderileri
CREATE TABLE "shop"."store_instagram_post" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "caption" TEXT,
    "mediaUrl" TEXT,
    "thumbnailUrl" TEXT,
    "mediaType" TEXT,
    "title" TEXT,
    "linkHref" TEXT,
    "linkLabel" TEXT,
    "coverImage" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_instagram_post_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_instagram_post_siteId_permalink_key" ON "shop"."store_instagram_post"("siteId", "permalink");
CREATE INDEX "store_instagram_post_siteId_published_sortOrder_idx" ON "shop"."store_instagram_post"("siteId", "published", "sortOrder");

ALTER TABLE "shop"."store_instagram_post" ADD CONSTRAINT "store_instagram_post_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
