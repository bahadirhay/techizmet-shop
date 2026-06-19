-- Açık hesap faturası ↔ sipariş bağlantısı
ALTER TABLE "shop"."finance_invoice" ADD COLUMN IF NOT EXISTS "orderId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "finance_invoice_siteId_orderId_key"
  ON "shop"."finance_invoice" ("siteId", "orderId")
  WHERE "orderId" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_invoice_orderId_fkey'
  ) THEN
    ALTER TABLE "shop"."finance_invoice"
      ADD CONSTRAINT "finance_invoice_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "shop"."order"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
