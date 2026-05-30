import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const html = readFileSync(join(process.cwd(), "public/theme/king-noor/mirror/index-tr.html"), "utf8");
const { patchMirrorStoreBridgeNavigation } = await import("../src/lib/mirror-store-bridge-nav-patch.ts");

const out = patchMirrorStoreBridgeNavigation(html);
const m = out.match(/<script id="kn-store-bridge">([\s\S]*?)<\/script>/i);
if (!m) {
  console.log("no kn-store-bridge");
  process.exit(1);
}
const body = m[1];
writeFileSync(join(process.cwd(), "scripts/_kn-store-bridge-patched.js"), body);
try {
  new vm.Script(body, { filename: "kn-store-bridge.js" });
  console.log("kn-store-bridge syntax OK");
} catch (e) {
  console.log(e.message);
  const lines = body.split("\n");
  const line = e.lineNumber || e.loc?.line;
  if (line) {
    for (let i = Math.max(0, line - 3); i < Math.min(lines.length, line + 3); i++) {
      console.log(String(i + 1).padStart(5), lines[i]);
    }
  }
}
