/**
 * Ürün pazaryeri özellikleri (marketplaceAttributesJson) — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:product-marketplace-attributes] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260707180000_product_marketplace_attributes/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:product-marketplace-attributes] tamam");
} catch (err) {
  console.error("[migrate:product-marketplace-attributes] hata (build devam ediyor):", err);
  process.exit(0);
}
