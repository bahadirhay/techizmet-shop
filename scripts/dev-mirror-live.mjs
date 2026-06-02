/** Mirror inject geliştirirken: prebuilt atlanır, HTML her istekte yeniden üretilir */
import { spawn } from "node:child_process";

process.env.MIRROR_DEV_LIVE = "1";

const child = spawn("npx", ["next", "dev", "-p", "5555"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
