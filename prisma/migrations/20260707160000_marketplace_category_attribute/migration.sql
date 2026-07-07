CREATE TABLE IF NOT EXISTS "shop"."marketplace_category_attribute" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "categoryId" TEXT,
    "attributeId" INTEGER NOT NULL,
    "attributeName" TEXT NOT NULL,
    "attributeValueId" INTEGER,
    "attributeValueName" TEXT,
    "customValue" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_category_attribute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_category_attribute_siteId_platform_categoryId_attributeId_key"
  ON "shop"."marketplace_category_attribute"("siteId", "platform", "categoryId", "attributeId");
CREATE INDEX IF NOT EXISTS "marketplace_category_attribute_siteId_platform_categoryId_idx"
  ON "shop"."marketplace_category_attribute"("siteId", "platform", "categoryId");
