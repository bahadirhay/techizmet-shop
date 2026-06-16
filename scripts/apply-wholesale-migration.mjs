/**
 * Toptan fiyat (wholesalePriceMinor) migration — Vercel build / deploy sırasında idempotent çalıştır.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:wholesale-price] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260617120000_product_wholesale_price/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:wholesale-price] tamam");
} catch (err) {
  console.error("[migrate:wholesale-price] hata (build devam ediyor):", err);
  process.exit(0);
}
