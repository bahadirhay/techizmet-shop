/**
 * Neon/Postgres erişim kontrolü — build öncesi kısa timeout.
 * Başarısızsa exit 1 (preflight mirror prebuild atlar).
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });

const url = process.env.DATABASE_URL?.trim();
const timeoutMs = Number(process.env.DB_PROBE_TIMEOUT_MS ?? 8000);

if (!url) {
  console.log("[db:probe] DATABASE_URL yok");
  process.exit(1);
}

const host = url.match(/@([^/]+)/)?.[1] ?? "?";
console.log(`[db:probe] ${host} (${timeoutMs}ms)`);

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

try {
  await Promise.race([
    prisma.$queryRaw`SELECT 1`,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("DB probe timeout")), timeoutMs);
    }),
  ]);
  console.log("[db:probe] ok");
  process.exit(0);
} catch (e) {
  console.error("[db:probe] fail:", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect().catch(() => undefined);
}
