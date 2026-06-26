import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate.tax-obligation] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260626120000_tax_obligation/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate.tax-obligation] tamam");
} catch (err) {
  console.error("[migrate.tax-obligation] hata (build devam ediyor):", err);
  process.exit(0);
}
