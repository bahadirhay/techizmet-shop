/**
 * Ana sayfa ürün sortOrder — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:product-home-sort] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260718120000_product_home_sort_order/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:product-home-sort] tamam");
} catch (err) {
  console.error("[migrate:product-home-sort] hata (build devam ediyor):", err);
  process.exit(0);
}
