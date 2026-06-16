CREATE TABLE IF NOT EXISTS "shop"."marketplace_commission_rule" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "categoryId" TEXT,
    "commissionPercent" DOUBLE PRECISION NOT NULL,
    "extraCommissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingModel" TEXT NOT NULL DEFAULT 'marketplace_cargo',
    "shippingFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketplace_commission_rule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "marketplace_commission_rule_siteId_platform_idx"
  ON "shop"."marketplace_commission_rule"("siteId", "platform");

ALTER TABLE "shop"."marketplace_commission_rule"
  ADD COLUMN IF NOT EXISTS "extraCommissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;
