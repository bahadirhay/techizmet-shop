-- Sipariş fatura adresi + TCKN/VKN; müşteri kartında varsayılan vergi bilgisi
ALTER TABLE "shop"."order" ADD COLUMN IF NOT EXISTS "billingAddressJson" TEXT;
ALTER TABLE "shop"."order" ADD COLUMN IF NOT EXISTS "billingTaxId" TEXT;
ALTER TABLE "shop"."order" ADD COLUMN IF NOT EXISTS "billingTaxOffice" TEXT;
ALTER TABLE "shop"."customer" ADD COLUMN IF NOT EXISTS "taxId" TEXT;
ALTER TABLE "shop"."customer" ADD COLUMN IF NOT EXISTS "taxOffice" TEXT;
