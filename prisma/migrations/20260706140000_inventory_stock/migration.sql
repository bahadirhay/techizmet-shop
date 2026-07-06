-- Stok kartları, hareket defteri, fatura eşlemesi, paketleme reçetesi

CREATE TABLE "shop"."stock_item" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'finished',
    "unit" TEXT NOT NULL DEFAULT 'adet',
    "balanceBase" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT,
    "variantId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop"."stock_movement" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qtyBase" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "refType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "lineKey" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "staffUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop"."finance_invoice_line_stock_mapping" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "descriptionNorm" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "invoiceUnit" TEXT NOT NULL DEFAULT 'adet',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_invoice_line_stock_mapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop"."product_recipe" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "outputProductId" TEXT NOT NULL,
    "outputVariantId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_recipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop"."product_recipe_line" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "qtyBasePerOutput" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_recipe_line_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop"."packaging_run" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "recipeId" TEXT,
    "outputProductId" TEXT NOT NULL,
    "outputVariantId" TEXT,
    "outputQty" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "staffUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packaging_run_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "shop"."finance_invoice" ADD COLUMN "stockPostedAt" TIMESTAMP(3);

CREATE INDEX "stock_item_siteId_kind_active_idx" ON "shop"."stock_item"("siteId", "kind", "active");
CREATE INDEX "stock_item_siteId_productId_idx" ON "shop"."stock_item"("siteId", "productId");
CREATE INDEX "stock_movement_siteId_occurredAt_idx" ON "shop"."stock_movement"("siteId", "occurredAt");
CREATE INDEX "stock_movement_siteId_stockItemId_occurredAt_idx" ON "shop"."stock_movement"("siteId", "stockItemId", "occurredAt");
CREATE UNIQUE INDEX "stock_movement_siteId_refType_refId_lineKey_stockItemId_key" ON "shop"."stock_movement"("siteId", "refType", "refId", "lineKey", "stockItemId");
CREATE UNIQUE INDEX "finance_invoice_line_stock_mapping_siteId_descriptionNorm_key" ON "shop"."finance_invoice_line_stock_mapping"("siteId", "descriptionNorm");
CREATE INDEX "product_recipe_siteId_outputProductId_idx" ON "shop"."product_recipe"("siteId", "outputProductId");
CREATE INDEX "product_recipe_line_recipeId_sortOrder_idx" ON "shop"."product_recipe_line"("recipeId", "sortOrder");
CREATE INDEX "packaging_run_siteId_occurredAt_idx" ON "shop"."packaging_run"("siteId", "occurredAt");

ALTER TABLE "shop"."stock_item" ADD CONSTRAINT "stock_item_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."stock_item" ADD CONSTRAINT "stock_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "shop"."product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shop"."stock_item" ADD CONSTRAINT "stock_item_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "shop"."product_variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shop"."stock_movement" ADD CONSTRAINT "stock_movement_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."stock_movement" ADD CONSTRAINT "stock_movement_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "shop"."stock_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shop"."finance_invoice_line_stock_mapping" ADD CONSTRAINT "finance_invoice_line_stock_mapping_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."finance_invoice_line_stock_mapping" ADD CONSTRAINT "finance_invoice_line_stock_mapping_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "shop"."stock_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shop"."product_recipe" ADD CONSTRAINT "product_recipe_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."product_recipe" ADD CONSTRAINT "product_recipe_outputProductId_fkey" FOREIGN KEY ("outputProductId") REFERENCES "shop"."product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shop"."product_recipe_line" ADD CONSTRAINT "product_recipe_line_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "shop"."product_recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."product_recipe_line" ADD CONSTRAINT "product_recipe_line_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "shop"."stock_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shop"."packaging_run" ADD CONSTRAINT "packaging_run_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."packaging_run" ADD CONSTRAINT "packaging_run_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "shop"."product_recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shop"."packaging_run" ADD CONSTRAINT "packaging_run_outputProductId_fkey" FOREIGN KEY ("outputProductId") REFERENCES "shop"."product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
