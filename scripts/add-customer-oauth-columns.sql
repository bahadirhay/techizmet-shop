ALTER TABLE shop.customer ADD COLUMN IF NOT EXISTS "googleSub" TEXT;
ALTER TABLE shop.customer ADD COLUMN IF NOT EXISTS "appleSub" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS customer_site_google_sub_key ON shop.customer ("siteId", "googleSub") WHERE "googleSub" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS customer_site_apple_sub_key ON shop.customer ("siteId", "appleSub") WHERE "appleSub" IS NOT NULL;
