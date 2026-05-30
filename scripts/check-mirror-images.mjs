import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "public/theme/techizmet-shop/cdn/shop");
const html = readFileSync("public/theme/techizmet-shop/mirror/index-tr.html", "utf8");
const re = /\/theme\/techizmet-shop\/cdn\/shop\/(files|articles)\/([^"'?]+)/g;
const missing = new Set();
let total = 0;
let miss = 0;
let m;
while ((m = re.exec(html))) {
  total++;
  const sub = m[1];
  const f = m[2];
  const p = join(root, sub, f);
  if (!existsSync(p)) {
    miss++;
    missing.add(`${sub}/${f}`);
  }
}
console.log("total refs", total, "missing", miss);
for (const x of [...missing].slice(0, 20)) console.log(" -", x);
