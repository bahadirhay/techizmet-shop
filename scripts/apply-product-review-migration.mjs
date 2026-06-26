/**
 * Ürün yorumları tablosu — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:product-review] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260625120000_product_review/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:product-review] tamam");
} catch (err) {
  console.error("[migrate:product-review] hata (build devam ediyor):", err);
  process.exit(0);
}
