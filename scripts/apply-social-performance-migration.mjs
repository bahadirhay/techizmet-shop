/**
 * Sosyal içerik: Instagram performans metrikleri önbelleği.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:social-performance] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260713140000_social_performance_json/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:social-performance] tamam");
} catch (err) {
  console.error("[migrate:social-performance] hata (build devam ediyor):", err);
  process.exit(0);
}
