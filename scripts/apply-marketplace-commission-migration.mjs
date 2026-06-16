import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:marketplace-commission] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260619120000_marketplace_commission_rule/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:marketplace-commission] tamam");
} catch (err) {
  console.error("[migrate:marketplace-commission] hata (build devam ediyor):", err);
  process.exit(0);
}
