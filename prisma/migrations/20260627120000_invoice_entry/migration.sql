CREATE TABLE IF NOT EXISTS "shop"."invoice_entry" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "invoiceDate" TIMESTAMP(3) NOT NULL,
  "invoiceNo" TEXT,
  "counterparty" TEXT,
  "netMinor" INTEGER NOT NULL,
  "kdvRate" INTEGER NOT NULL,
  "kdvMinor" INTEGER NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_entry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "invoice_entry_siteId_invoiceDate_idx" ON "shop"."invoice_entry"("siteId", "invoiceDate");
CREATE INDEX IF NOT EXISTS "invoice_entry_siteId_direction_invoiceDate_idx" ON "shop"."invoice_entry"("siteId", "direction", "invoiceDate");

ALTER TABLE "shop"."invoice_entry" DROP CONSTRAINT IF EXISTS "invoice_entry_siteId_fkey";
ALTER TABLE "shop"."invoice_entry" ADD CONSTRAINT "invoice_entry_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "shop"."StoreSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
