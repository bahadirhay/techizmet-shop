/**
 * refresh-mirror-tr-html.ts ile bozulmuş URL/script kalıntılarını düzeltir.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const MIRROR_ROOT = join(process.cwd(), "public/theme/techizmet-shop/mirror");

const FIXES = [
  [/URLAramaParams/g, "URLSearchParams"],
  [/Cilt Bakımı_solutions/g, "Skincare_solutions"],
  [/Cilt%20Bakımı_solutions/g, "Skincare_solutions"],
];

function walkHtml(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkHtml(p, acc);
    else if (name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

let n = 0;
for (const abs of walkHtml(MIRROR_ROOT)) {
  let html = readFileSync(abs, "utf8");
  let changed = false;
  for (const [re, rep] of FIXES) {
    if (re.test(html)) {
      html = html.replace(re, rep);
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(abs, html, "utf8");
    n++;
    console.log("✓", relative(process.cwd(), abs));
  }
}
console.log(`\n${n} HTML dosyası onarıldı.`);
