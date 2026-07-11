/**
 * social_content_draft.externalId — platform tarafındaki gönderi/medya id'si
 * (Instagram insights sorguları için gerekli). Vercel build sırasında idempotent çalışır.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:social-content-draft-external-id] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260711130000_social_content_draft_external_id/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:social-content-draft-external-id] tamam");
} catch (err) {
  console.error("[migrate:social-content-draft-external-id] hata (build devam ediyor):", err);
  process.exit(0);
}
