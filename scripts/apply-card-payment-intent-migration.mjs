/**
 * Kart ödeme intent tablosu — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:card-payment-intent] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260709130000_card_payment_intent/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:card-payment-intent] tamam");
} catch (err) {
  console.error("[migrate:card-payment-intent] hata (build devam ediyor):", err);
  process.exit(0);
}
