/**
 * Sipariş fatura adresi + TCKN — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:order-billing-tax] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260619120000_order_billing_tax/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:order-billing-tax] tamam");
} catch (err) {
  console.error("[migrate:order-billing-tax] hata (build devam ediyor):", err);
  process.exit(0);
}
