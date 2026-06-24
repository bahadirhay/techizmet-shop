/**
 * Next.js production build — ayri surec, webpack bellek limiti.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const heapMb = Number(process.env.NEXT_BUILD_HEAP_MB || "6144");
const useWebpack = process.env.NEXT_BUILD_WEBPACK !== "0";
const nextArgs = ["build"];
if (useWebpack) nextArgs.push("--webpack");

console.log(
  `[vercel:next-build] Basliyor (heap=${heapMb}MB, bundler=${useWebpack ? "webpack" : "default"})...`,
);

const result = spawnSync(process.execPath, [nextBin, ...nextArgs], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: `--max-old-space-size=${heapMb}`,
    GENERATE_SOURCEMAP: "false",
    NEXT_DISABLE_SOURCEMAPS: "1",
  },
});

process.exit(result.status ?? 1);
