-- Profesyonel çerez rıza kaydı: politika versiyonu, kaynak, dil
ALTER TABLE "shop"."cookie_consent_log" ADD COLUMN IF NOT EXISTS "policyVersion" TEXT;
ALTER TABLE "shop"."cookie_consent_log" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "shop"."cookie_consent_log" ADD COLUMN IF NOT EXISTS "locale" TEXT;

CREATE INDEX IF NOT EXISTS "cookie_consent_log_siteId_createdAt_idx"
  ON "shop"."cookie_consent_log"("siteId", "createdAt");

CREATE INDEX IF NOT EXISTS "cookie_consent_log_siteId_decision_createdAt_idx"
  ON "shop"."cookie_consent_log"("siteId", "decision", "createdAt");
