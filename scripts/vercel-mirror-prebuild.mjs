/**
 * Mirror prebuild — ayrı Node süreci; bittiğinde bellek tamamen serbest kalır.
 * Vercel OOM: prebuild + next build aynı heap'te birikmemeli.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const skipFlag = ".vercel-skip-mirror-prebuild";
if (process.env.SKIP_MIRROR_PREBUILD === "1" || existsSync(skipFlag)) {
  console.log("[vercel:mirror-prebuild] Atlandi (flag veya SKIP_MIRROR_PREBUILD=1).");
  process.exit(0);
}

const heapMb = Number(process.env.MIRROR_PREBUILD_HEAP_MB || "3072");
const args = [
  `--max-old-space-size=${heapMb}`,
  "--require",
  "./scripts/shim-server-only.cjs",
  "./node_modules/tsx/dist/cli.mjs",
  "scripts/prebuild-mirror-cache.ts",
];

console.log(`[vercel:mirror-prebuild] Basliyor (heap=${heapMb}MB)...`);
const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: "",
    MIRROR_PREBUILD_CATEGORY_BATCH: process.env.MIRROR_PREBUILD_CATEGORY_BATCH || "1",
  },
});

process.exit(result.status ?? 1);
