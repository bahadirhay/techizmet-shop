/**
 * Sipariş gerçek değerleri (financeActualsJson) — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:order-finance-actuals] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260714200000_order_finance_actuals/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:order-finance-actuals] tamam");
} catch (err) {
  console.error("[migrate:order-finance-actuals] hata (build devam ediyor):", err);
  process.exit(0);
}
