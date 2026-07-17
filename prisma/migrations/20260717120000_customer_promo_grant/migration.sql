-- Paket QR kişisel süreli indirim grant tablosu
CREATE TABLE IF NOT EXISTS shop.customer_promo_grant (
  id TEXT PRIMARY KEY,
  "siteId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  source TEXT NOT NULL,
  code TEXT NOT NULL,
  "percentOff" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "redeemedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT customer_promo_grant_siteId_fkey
    FOREIGN KEY ("siteId") REFERENCES shop.site(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT customer_promo_grant_customerId_fkey
    FOREIGN KEY ("customerId") REFERENCES shop.customer(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_promo_grant_siteId_customerId_source_key
  ON shop.customer_promo_grant ("siteId", "customerId", source);

CREATE UNIQUE INDEX IF NOT EXISTS customer_promo_grant_siteId_code_key
  ON shop.customer_promo_grant ("siteId", code);

CREATE INDEX IF NOT EXISTS customer_promo_grant_siteId_source_idx
  ON shop.customer_promo_grant ("siteId", source);
