ALTER TABLE shop.product ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'standard';

CREATE TABLE IF NOT EXISTS shop.product_bundle_component (
  id TEXT PRIMARY KEY,
  "bundleProductId" TEXT NOT NULL REFERENCES shop.product(id) ON DELETE CASCADE,
  "componentProductId" TEXT NOT NULL REFERENCES shop.product(id) ON DELETE RESTRICT,
  "componentVariantId" TEXT REFERENCES shop.product_variant(id) ON DELETE SET NULL,
  "qtyPerBundle" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS product_bundle_component_bundle_idx
  ON shop.product_bundle_component ("bundleProductId", "sortOrder");

CREATE INDEX IF NOT EXISTS product_bundle_component_component_idx
  ON shop.product_bundle_component ("componentProductId");

ALTER TABLE shop.order_line ADD COLUMN IF NOT EXISTS "lineKind" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE shop.order_line ADD COLUMN IF NOT EXISTS "bundleProductId" TEXT;
ALTER TABLE shop.order_line ADD COLUMN IF NOT EXISTS "componentsSnapshotJson" TEXT;
