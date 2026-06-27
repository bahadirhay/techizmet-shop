import { execSync } from "node:child_process";

const db = process.env.DATABASE_URL?.trim() || "";
if (!db) {
  console.log("[migrate.invoice-entry] DATABASE_URL yok — atlanıyor");
  process.exit(0);
}

try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260627120000_invoice_entry/migration.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[migrate.invoice-entry] tamam");
} catch (err) {
  console.error("[migrate.invoice-entry] hata (build devam ediyor):", err);
  process.exit(0);
}
