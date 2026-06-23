/**
 * Belirtilen env dosyası ile Next dev — ana .env dosyasına dokunmaz.
 * Kullanım: node scripts/dev-with-env.mjs .env.shop 5555
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

const envFile = process.argv[2];
const port = process.argv[3] ?? "5555";

if (!envFile) {
  console.error("[dev] Kullanım: node scripts/dev-with-env.mjs <env-dosyası> [port]");
  process.exit(1);
}

const envPath = resolve(process.cwd(), envFile);
if (!existsSync(envPath)) {
  console.error(`[dev] Env dosyası yok: ${envFile}`);
  if (envFile === ".env.shop") {
    console.error("  copy .env.shop.example .env.shop");
    console.error("  Ardından DATABASE_URL ve ADMIN_PASSWORD doldurun.");
  } else if (envFile === ".env.anatolianpaw") {
    console.error("  copy .env.anatolianpaw.example .env.anatolianpaw");
  }
  process.exit(1);
}

loadEnv({ path: envPath, override: true });

const slug = process.env.STORE_SITE_SLUG?.trim() || "demo";
console.log(`[dev] ${envFile} → http://localhost:${port} (STORE_SITE_SLUG=${slug})`);

const child = spawn("npx", ["next", "dev", "--webpack", "-p", port], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
