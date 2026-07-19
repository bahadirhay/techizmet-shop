/**
 * storeVisible — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:product-store-visible] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260719120000_product_store_visible/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:product-store-visible] tamam");
} catch (err) {
  console.error("[migrate:product-store-visible] hata (build devam ediyor):", err);
  process.exit(0);
}
