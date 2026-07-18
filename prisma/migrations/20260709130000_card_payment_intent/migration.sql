-- Kart ödemesi tamamlanana kadar sipariş oluşturulmaz; checkout verisi geçici intent'te tutulur.
CREATE TABLE IF NOT EXISTS "shop"."card_payment_intent" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "customerId" TEXT,
    "visitorKey" TEXT,
    "iyzicoToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_payment_intent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "card_payment_intent_siteId_reference_key" ON "shop"."card_payment_intent"("siteId", "reference");

CREATE INDEX IF NOT EXISTS "card_payment_intent_siteId_expiresAt_idx" ON "shop"."card_payment_intent"("siteId", "expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'card_payment_intent_siteId_fkey'
  ) THEN
    ALTER TABLE "shop"."card_payment_intent"
      ADD CONSTRAINT "card_payment_intent_siteId_fkey"
      FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
