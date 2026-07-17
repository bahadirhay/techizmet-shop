/**
 * CustomerPromoGrant — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:customer-promo-grant] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260717120000_customer_promo_grant/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:customer-promo-grant] tamam");
} catch (err) {
  console.error("[migrate:customer-promo-grant] hata (build devam ediyor):", err);
  process.exit(0);
}
