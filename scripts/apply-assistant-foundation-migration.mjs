/**
 * AI işletme asistanı tabloları — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:assistant-foundation] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260623120000_assistant_foundation/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:assistant-foundation] tamam");
} catch (err) {
  console.error("[migrate:assistant-foundation] hata (build devam ediyor):", err);
  process.exit(0);
}
