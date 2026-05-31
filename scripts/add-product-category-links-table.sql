CREATE TABLE IF NOT EXISTS shop.product_category (
  "productId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT product_category_pkey PRIMARY KEY ("productId", "categoryId")
);

CREATE INDEX IF NOT EXISTS "product_category_categoryId_sortOrder_idx"
  ON shop.product_category ("categoryId", "sortOrder");

DO $$
BEGIN
  ALTER TABLE shop.product_category
    ADD CONSTRAINT product_category_productId_fkey
    FOREIGN KEY ("productId") REFERENCES shop.product(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE shop.product_category
    ADD CONSTRAINT product_category_categoryId_fkey
    FOREIGN KEY ("categoryId") REFERENCES shop.category(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
