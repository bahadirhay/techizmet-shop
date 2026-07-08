CREATE TABLE IF NOT EXISTS "shop"."trendyol_question" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'trendyol',
  "questionId" TEXT NOT NULL,
  "questionText" TEXT NOT NULL,
  "customerName" TEXT,
  "productBarcode" TEXT,
  "productName" TEXT,
  "productId" TEXT,
  "tyStatus" TEXT NOT NULL DEFAULT 'WAITING_FOR_ANSWER',
  "answerStatus" TEXT NOT NULL DEFAULT 'needs_review',
  "answerText" TEXT,
  "answerSource" TEXT,
  "answerLayer" TEXT,
  "confidence" DOUBLE PRECISION,
  "lastError" TEXT,
  "askedAt" TIMESTAMP(3),
  "answeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trendyol_question_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "trendyol_question_siteId_questionId_key" ON "shop"."trendyol_question"("siteId", "questionId");
CREATE INDEX IF NOT EXISTS "trendyol_question_siteId_answerStatus_createdAt_idx" ON "shop"."trendyol_question"("siteId", "answerStatus", "createdAt");

DO $$ BEGIN
  ALTER TABLE "shop"."trendyol_question"
    ADD CONSTRAINT "trendyol_question_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
