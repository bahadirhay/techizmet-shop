/**
 * Sosyal içerik taslakları — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:social-content] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260622140000_social_content_draft/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:social-content] tamam");
} catch (err) {
  console.error("[migrate:social-content] hata (build devam ediyor):", err);
  process.exit(0);
}
