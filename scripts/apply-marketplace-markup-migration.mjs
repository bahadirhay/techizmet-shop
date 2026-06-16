import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate:marketplace-markup] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260618120000_product_marketplace_markup/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate:marketplace-markup] tamam");
} catch (err) {
  console.error("[migrate:marketplace-markup] hata (build devam ediyor):", err);
  process.exit(0);
}
