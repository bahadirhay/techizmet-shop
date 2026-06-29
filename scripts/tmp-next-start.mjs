import { config as loadEnv } from "dotenv";
import { spawnSync } from "node:child_process";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

function stripQuotes(v) {
  const s = (v ?? "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

const env = { ...process.env };
if (env.DATABASE_URL) env.DATABASE_URL = stripQuotes(env.DATABASE_URL);
if (env.DATABASE_URL_ANATOLIANPAW) {
  env.DATABASE_URL_ANATOLIANPAW = stripQuotes(env.DATABASE_URL_ANATOLIANPAW);
}

const port = process.argv[2] ?? "3458";
const r = spawnSync("npx", ["next", "start", "-p", port], { stdio: "inherit", env, shell: true });
process.exit(r.status ?? 1);
