/** HTTrack kaynağından tüm shop görsellerini geri yükler. */
import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCE =
  process.env.THEME_MIRROR_PATH?.trim() ||
  "C:/My Web Sites/shop/theking-noor.myshopify.com";
const ROOT = join(process.cwd(), "public/theme/techizmet-shop/cdn/shop");

function walkJpegs(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkJpegs(p));
    else if (/\.jpe?g$/i.test(name)) out.push(p);
  }
  return out;
}

const files = walkJpegs(ROOT);
let restored = 0;
let missing = 0;

for (const file of files) {
  const rel = file.replace(join(process.cwd(), "public", "theme", "techizmet-shop"), "").replace(/\\/g, "/");
  const src = join(SOURCE, rel.replace(/^\//, ""));
  if (!existsSync(src)) {
    missing++;
    continue;
  }
  copyFileSync(src, file);
  restored++;
}

const logos = [
  ["cdn/shop/files/noor-dark-logo34d3.svg", "cdn/shop/files/noor-dark-logo34d3.svg"],
  ["cdn/shop/files/noor-white-logo34d3.svg", "cdn/shop/files/noor-white-logo34d3.svg"],
];

for (const [rel] of logos) {
  const src = join(SOURCE, rel);
  const dest = join(process.cwd(), "public/theme/techizmet-shop", rel);
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log("Logo geri yüklendi:", rel);
  }
}

console.log(`${restored}/${files.length} JPEG geri yüklendi, ${missing} kaynakta yok.`);
