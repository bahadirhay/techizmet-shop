CREATE TABLE IF NOT EXISTS shop.password_reset_token (
  id TEXT PRIMARY KEY,
  "siteId" TEXT NOT NULL REFERENCES shop.site(id) ON DELETE CASCADE,
  "customerId" TEXT NOT NULL REFERENCES shop.customer(id) ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_reset_token_site_token_idx
  ON shop.password_reset_token ("siteId", "tokenHash");

CREATE INDEX IF NOT EXISTS password_reset_token_customer_idx
  ON shop.password_reset_token ("customerId", "createdAt");
