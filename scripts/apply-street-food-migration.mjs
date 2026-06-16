/**
 * Mama fonu manuel katkı migration — Vercel build / deploy sırasında idempotent çalıştır.
 */
import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:street-food-manual] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260616120000_street_food_manual_contribution/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:street-food-manual] tamam");
} catch (err) {
  console.error("[migrate:street-food-manual] hata (build devam ediyor):", err);
  process.exit(0);
}
