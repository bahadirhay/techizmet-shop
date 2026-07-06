/**
 * Envanter / stok modülü migration — Vercel build sırasında idempotent çalıştır.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:inventory-stock] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260706140000_inventory_stock/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:inventory-stock] tamam");
} catch (err) {
  console.error("[migrate:inventory-stock] hata (build devam ediyor):", err);
  process.exit(0);
}
