/**
 * Pazaryeri kategori özellik eşlemesi tablosu — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:marketplace-category-attribute] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260707160000_marketplace_category_attribute/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:marketplace-category-attribute] tamam");
} catch (err) {
  console.error("[migrate:marketplace-category-attribute] hata (build devam ediyor):", err);
  process.exit(0);
}
