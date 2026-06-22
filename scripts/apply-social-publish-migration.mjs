/**
 * Sosyal yayın meta alanları — Vercel build sırasında idempotent.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:social-publish] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260622150000_social_publish_meta/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:social-publish] tamam");
} catch (err) {
  console.error("[migrate:social-publish] hata (build devam ediyor):", err);
  process.exit(0);
}
