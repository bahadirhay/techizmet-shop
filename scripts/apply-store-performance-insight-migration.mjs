/**
 * Çoklu kanal performans analizi (Trendyol/Amazon/Instagram) öneri kuyruğu tablosu.
 * Vercel build sırasında idempotent çalışır.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:store-performance-insight] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260711120000_store_performance_insight/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:store-performance-insight] tamam");
} catch (err) {
  console.error("[migrate:store-performance-insight] hata (build devam ediyor):", err);
  process.exit(0);
}
