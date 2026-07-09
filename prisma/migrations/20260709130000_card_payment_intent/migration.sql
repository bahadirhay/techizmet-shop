-- Kart ödemesi tamamlanana kadar sipariş oluşturulmaz; checkout verisi geçici intent'te tutulur.
CREATE TABLE "shop"."card_payment_intent" (
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

CREATE UNIQUE INDEX "card_payment_intent_siteId_reference_key" ON "shop"."card_payment_intent"("siteId", "reference");

CREATE INDEX "card_payment_intent_siteId_expiresAt_idx" ON "shop"."card_payment_intent"("siteId", "expiresAt");

ALTER TABLE "shop"."card_payment_intent" ADD CONSTRAINT "card_payment_intent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
