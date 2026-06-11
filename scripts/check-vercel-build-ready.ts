/**
 * Vercel build oncesi kontrol - DATABASE_URL, magaza slug, istege bagli mirror prebuild + tsc.
 * Kullanim: npx tsx scripts/check-vercel-build-ready.ts [--prebuild] [--env-file=.env.anatolianpaw]
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

async function main() {
  const envFile = argValue("--env-file") ?? ".env.anatolianpaw";
  config({ path: resolve(process.cwd(), envFile) });
  config({ path: resolve(process.cwd(), ".env"), override: true });

  const runPrebuild = process.argv.includes("--prebuild");
  const errors: string[] = [];

  function requireEnv(name: string, minLen = 1) {
    const v = process.env[name]?.trim() ?? "";
    if (v.length < minLen) errors.push(`${name} eksik veya cok kisa`);
    return v;
  }

  const databaseUrl = requireEnv("DATABASE_URL", 20);
  const slug = requireEnv("STORE_SITE_SLUG", 2);
  requireEnv("SESSION_SECRET", 32);
  const siteUrl = requireEnv("NEXT_PUBLIC_SITE_URL", 8);
  const storeUrl = requireEnv("NEXT_PUBLIC_STORE_URL", 8);

  if (!databaseUrl.includes("pooler") && !process.argv.includes("--allow-direct-db")) {
    console.warn(
      "[uyari] DATABASE_URL pooler icermiyor. Vercel/serverless icin Neon *-pooler* URL onerilir.",
    );
  }

  if (errors.length) {
    console.error("[build-ready] Ortam degiskeni hatalari:");
    for (const e of errors) console.error("  -", e);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const site = await prisma.storeSite.findUnique({ where: { slug } });
    if (!site) {
      console.error(
        `[build-ready] Veritabaninda slug="${slug}" magazasi yok. Once: npm run setup:paw:prod veya store:provision`,
      );
      process.exit(2);
    }
    console.log(`[build-ready] DB ok - magaza: ${site.name} (${site.slug})`);
  } catch (e) {
    console.error("[build-ready] Veritabani baglantisi basarisiz:", e instanceof Error ? e.message : e);
    process.exit(3);
  } finally {
    await prisma.$disconnect();
  }

  console.log(`[build-ready] NEXT_PUBLIC_SITE_URL=${siteUrl}`);
  console.log(`[build-ready] NEXT_PUBLIC_STORE_URL=${storeUrl}`);

  console.log("[build-ready] TypeScript kontrolu...");
  try {
    execSync("npx tsc --noEmit", { stdio: "inherit" });
  } catch {
    process.exit(4);
  }

  if (runPrebuild) {
    console.log("[build-ready] mirror:prebuild (Vercel build adimi)...");
    try {
      execSync(
        "node --require ./scripts/shim-server-only.cjs ./node_modules/tsx/dist/cli.mjs scripts/prebuild-mirror-cache.ts",
        { stdio: "inherit", env: process.env },
      );
    } catch {
      process.exit(5);
    }
  }

  console.log("[build-ready] Tamam - Vercel deploy icin hazir gorunuyor.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
