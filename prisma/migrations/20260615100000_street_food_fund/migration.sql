-- Sokak Dostları Mama Fonu
CREATE TABLE "shop"."street_food_campaign" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "targetGrams" INTEGER NOT NULL,
    "collectedGrams" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sloganTr" TEXT,
    "sloganEn" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "street_food_campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop"."street_food_contribution" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "grams" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "street_food_contribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop"."street_food_donation" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "gramsDelivered" INTEGER NOT NULL,
    "storyHtml" TEXT,
    "photoUrlsJson" TEXT,
    "videoUrl" TEXT,
    "donatedAt" TIMESTAMP(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "street_food_donation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "street_food_contribution_orderId_key" ON "shop"."street_food_contribution"("orderId");
CREATE INDEX "street_food_campaign_siteId_status_idx" ON "shop"."street_food_campaign"("siteId", "status");
CREATE INDEX "street_food_contribution_siteId_campaignId_idx" ON "shop"."street_food_contribution"("siteId", "campaignId");
CREATE INDEX "street_food_contribution_campaignId_createdAt_idx" ON "shop"."street_food_contribution"("campaignId", "createdAt");
CREATE INDEX "street_food_donation_siteId_published_donatedAt_idx" ON "shop"."street_food_donation"("siteId", "published", "donatedAt");
CREATE INDEX "street_food_donation_campaignId_idx" ON "shop"."street_food_donation"("campaignId");

ALTER TABLE "shop"."street_food_campaign" ADD CONSTRAINT "street_food_campaign_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."street_food_contribution" ADD CONSTRAINT "street_food_contribution_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."street_food_contribution" ADD CONSTRAINT "street_food_contribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "shop"."street_food_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."street_food_contribution" ADD CONSTRAINT "street_food_contribution_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "shop"."order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."street_food_donation" ADD CONSTRAINT "street_food_donation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."street_food_donation" ADD CONSTRAINT "street_food_donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "shop"."street_food_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
