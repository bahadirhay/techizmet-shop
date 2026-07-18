/**
 * Katalog (collections/all) catalogSortOrder — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:product-catalog-sort] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260718140000_product_catalog_sort_order/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:product-catalog-sort] tamam");
} catch (err) {
  console.error("[migrate:product-catalog-sort] hata (build devam ediyor):", err);
  process.exit(0);
}
