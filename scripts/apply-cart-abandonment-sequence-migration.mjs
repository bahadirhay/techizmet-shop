/**
 * cart_abandonment.reminderStage + email_suppression tablosu — 3 aşamalı terk sepet
 * hatırlatma dizisi için. Vercel build sırasında idempotent çalışır.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:cart-abandonment-sequence] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260712100000_cart_abandonment_sequence/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:cart-abandonment-sequence] tamam");
} catch (err) {
  console.error("[migrate:cart-abandonment-sequence] hata (build devam ediyor):", err);
  process.exit(0);
}
