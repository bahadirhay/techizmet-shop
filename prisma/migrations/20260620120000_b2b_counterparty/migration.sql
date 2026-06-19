-- B2B müşteri onayı + cari risk / açık hesap alanları
ALTER TABLE "shop"."customer" ADD COLUMN IF NOT EXISTS "b2bStatus" TEXT;
ALTER TABLE "shop"."customer" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "shop"."customer" ADD COLUMN IF NOT EXISTS "b2bAppliedAt" TIMESTAMP(3);
ALTER TABLE "shop"."customer" ADD COLUMN IF NOT EXISTS "b2bApprovedAt" TIMESTAMP(3);
ALTER TABLE "shop"."customer" ADD COLUMN IF NOT EXISTS "b2bApprovedByStaffUserId" TEXT;
ALTER TABLE "shop"."customer" ADD COLUMN IF NOT EXISTS "b2bApplicationNote" TEXT;

ALTER TABLE "shop"."customer_group" ADD COLUMN IF NOT EXISTS "isB2b" BOOLEAN DEFAULT false;
ALTER TABLE "shop"."customer_group" ADD COLUMN IF NOT EXISTS "openAccountEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "shop"."customer_group" ADD COLUMN IF NOT EXISTS "defaultPaymentTermDays" INTEGER;
ALTER TABLE "shop"."customer_group" ADD COLUMN IF NOT EXISTS "defaultCreditLimitMinor" INTEGER;

ALTER TABLE "shop"."finance_counterparty" ADD COLUMN IF NOT EXISTS "paymentTermDays" INTEGER;
ALTER TABLE "shop"."finance_counterparty" ADD COLUMN IF NOT EXISTS "creditLimitMinor" INTEGER;
ALTER TABLE "shop"."finance_counterparty" ADD COLUMN IF NOT EXISTS "openAccountEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "shop"."finance_counterparty" ADD COLUMN IF NOT EXISTS "preferredPaymentMethod" TEXT;
ALTER TABLE "shop"."finance_counterparty" ADD COLUMN IF NOT EXISTS "creditHold" BOOLEAN DEFAULT false;
ALTER TABLE "shop"."finance_counterparty" ADD COLUMN IF NOT EXISTS "tags" TEXT;
