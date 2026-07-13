/**
 * Sosyal içerik stüdyosu: AI brif ve görsel kaynağı alanları.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:social-creative-brief] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260713120000_social_creative_brief/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:social-creative-brief] tamam");
} catch (err) {
  console.error("[migrate:social-creative-brief] hata (build devam ediyor):", err);
  process.exit(0);
}
