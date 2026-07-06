/**
 * Stok kartı barkod + görsel alanları — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:inventory-stock-meta] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260706165000_stock_item_barcode_image/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:inventory-stock-meta] tamam");
} catch (err) {
  console.error("[migrate:inventory-stock-meta] hata (build devam ediyor):", err);
  process.exit(0);
}
