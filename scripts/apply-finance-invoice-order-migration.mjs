/**
 * FinanceInvoice.orderId — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:finance-invoice-order] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260621120000_finance_invoice_order/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:finance-invoice-order] tamam");
} catch (err) {
  console.error("[migrate:finance-invoice-order] hata (build devam ediyor):", err);
  process.exit(0);
}
