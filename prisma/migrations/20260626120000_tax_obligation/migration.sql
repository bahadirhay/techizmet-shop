CREATE TABLE IF NOT EXISTS "shop"."tax_obligation" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "periodLabel" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'bekliyor',
  "baseMinor" INTEGER NOT NULL DEFAULT 0,
  "taxMinor" INTEGER NOT NULL DEFAULT 0,
  "stampDutyMinor" INTEGER NOT NULL DEFAULT 0,
  "paidMinor" INTEGER NOT NULL DEFAULT 0,
  "calcJson" TEXT,
  "notes" TEXT,
  "declaredAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tax_obligation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tax_obligation_siteId_periodKey_key" ON "shop"."tax_obligation"("siteId", "periodKey");
CREATE INDEX IF NOT EXISTS "tax_obligation_siteId_year_idx" ON "shop"."tax_obligation"("siteId", "year");
CREATE INDEX IF NOT EXISTS "tax_obligation_siteId_status_dueDate_idx" ON "shop"."tax_obligation"("siteId", "status", "dueDate");

DO $$ BEGIN
  ALTER TABLE "shop"."tax_obligation"
    ADD CONSTRAINT "tax_obligation_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
