-- 3 aşamalı terk sepet hatırlatma dizisi + abonelikten çıkma listesi
ALTER TABLE "shop"."cart_abandonment" ADD COLUMN IF NOT EXISTS "reminderStage" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "shop"."email_suppression" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'unsubscribe',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_suppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_suppression_siteId_email_key" ON "shop"."email_suppression"("siteId", "email");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_suppression_siteId_fkey'
  ) THEN
    ALTER TABLE "shop"."email_suppression"
      ADD CONSTRAINT "email_suppression_siteId_fkey"
      FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
