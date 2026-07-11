CREATE TABLE IF NOT EXISTS "shop"."store_performance_insight" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'medium',
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "actionType" TEXT NOT NULL DEFAULT 'none',
  "payloadJson" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "sourceSnapshotJson" TEXT,
  "decidedAt" TIMESTAMP(3),
  "decidedBy" TEXT,
  "executedAt" TIMESTAMP(3),
  "executionError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_performance_insight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "store_performance_insight_siteId_status_createdAt_idx" ON "shop"."store_performance_insight"("siteId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "store_performance_insight_siteId_channel_idx" ON "shop"."store_performance_insight"("siteId", "channel");

DO $$ BEGIN
  ALTER TABLE "shop"."store_performance_insight"
    ADD CONSTRAINT "store_performance_insight_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
