/**
 * Kampanya firstOrderOnly — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:campaign-first-order] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260622120000_campaign_first_order/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:campaign-first-order] tamam");
} catch (err) {
  console.error("[migrate:campaign-first-order] hata (build devam ediyor):", err);
  process.exit(0);
}
