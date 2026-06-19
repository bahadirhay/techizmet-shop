/**
 * B2B onay + cari risk — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:b2b-counterparty] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260620120000_b2b_counterparty/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:b2b-counterparty] tamam");
} catch (err) {
  console.error("[migrate:b2b-counterparty] hata (build devam ediyor):", err);
  process.exit(0);
}
