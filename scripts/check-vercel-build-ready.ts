/**
 * Vercel build öncesi kontrol — DATABASE_URL, mağaza slug, isteğe bağlı mirror prebuild + tsc.
 * Kullanım: npx tsx scripts/check-vercel-build-ready.ts [--prebuild] [--env-file=.env.anatolianpaw]
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function argValue(flag: string): string | undefined {
  const hit = process.argv.find((a) => a === flag || a.startsWith(`${flag}=`));
  if (!hit) return undefined;
  if (hit.includes("=")) return hit.slice(hit.indexOf("=") + 1).trim() || undefined;
  const i = process.argv.indexOf(hit);
  return process.argv[i + 1]?.trim();
}

const envFile = argValue("--env-file") ?? ".env.anatolianpaw";
config({ path: resolve(process.cwd(), envFile) });
config({ path: resolve(process.cwd(), ".env"), override: true });

const runPrebuild = process.argv.includes("--prebuild");
const errors: string[] = [];

function requireEnv(name: string, minLen = 1) {
  const v = process.env[name]?.trim() ?? "";
  if (v.length < minLen) errors.push(`${name} eksik veya çok kısa`);
  return v;
}

const databaseUrl = requireEnv("DATABASE_URL", 20);
const slug = requireEnv("STORE_SITE_SLUG", 2);
requireEnv("SESSION_SECRET", 32);
const siteUrl = requireEnv("NEXT_PUBLIC_SITE_URL", 8);
const storeUrl = requireEnv("NEXT_PUBLIC_STORE_URL", 8);

if (!databaseUrl.includes("pooler") && !process.argv.includes("--allow-direct-db")) {
  console.warn(
    "[uyarı] DATABASE_URL pooler içermiyor. Vercel/serverless için Neon *-pooler* URL önerilir.",
  );
}

if (errors.length) {
  console.error("[build-ready] Ortam değişkeni hataları:");
  for (const e of errors) console.error("  -", e);
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const site = await prisma.storeSite.findUnique({ where: { slug } });
  if (!site) {
    console.error(
      `[build-ready] Veritabanında slug="${slug}" mağazası yok. Önce: npm run setup:paw:prod veya store:provision`,
    );
    process.exit(2);
  }
  console.log(`[build-ready] DB ok — mağaza: ${site.name} (${site.slug})`);
} catch (e) {
  console.error("[build-ready] Veritabanı bağlantısı başarısız:", e instanceof Error ? e.message : e);
  process.exit(3);
} finally {
  await prisma.$disconnect();
}

console.log(`[build-ready] NEXT_PUBLIC_SITE_URL=${siteUrl}`);
console.log(`[build-ready] NEXT_PUBLIC_STORE_URL=${storeUrl}`);

console.log("[build-ready] TypeScript kontrolü...");
try {
  execSync("npx tsc --noEmit", { stdio: "inherit" });
} catch {
  process.exit(4);
}

if (runPrebuild) {
  console.log("[build-ready] mirror:prebuild (Vercel build adımı)...");
  try {
    execSync(
      "node --require ./scripts/shim-server-only.cjs ./node_modules/tsx/dist/cli.mjs scripts/prebuild-mirror-cache.ts",
      { stdio: "inherit", env: process.env },
    );
  } catch {
    process.exit(5);
  }
}

console.log("[build-ready] Tamam — Vercel deploy için hazır görünüyor.");
