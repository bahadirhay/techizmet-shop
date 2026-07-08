/**
 * Trendyol müşteri soruları / otomatik cevaplama kuyruğu tablosu.
 * Vercel build sırasında idempotent çalışır.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:trendyol-question] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260708030000_trendyol_question/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:trendyol-question] tamam");
} catch (err) {
  console.error("[migrate:trendyol-question] hata (build devam ediyor):", err);
  process.exit(0);
}
