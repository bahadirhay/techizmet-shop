#!/usr/bin/env node
/** @deprecated — mirror:sanitize kullanın */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync("node", ["scripts/sanitize-mirror-html.mjs"], {
  cwd: root,
  stdio: "inherit",
});
process.exit(r.status ?? 1);
