/**
 * Tüm mirror *-tr.html dosyalarına EN→TR sözlüğünü uygular (disk üzerinde).
 * Kullanım: npx tsx scripts/refresh-mirror-tr-html.ts
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { localizeMirrorHtml } from "../src/lib/mirror-html-locale";

const MIRROR_ROOT = join(process.cwd(), "public/theme/techizmet-shop/mirror");

function walkTrHtml(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkTrHtml(p, acc);
    else if (name.endsWith("-tr.html")) acc.push(p);
  }
  return acc;
}

let updated = 0;
for (const abs of walkTrHtml(MIRROR_ROOT)) {
  const relPublic = relative(join(process.cwd(), "public"), abs).replace(/\\/g, "/");
  const before = readFileSync(abs, "utf8");
  const after = localizeMirrorHtml(before, relPublic, "tr");
  if (after !== before) {
    writeFileSync(abs, after, "utf8");
    updated++;
    console.log("✓", relPublic);
  }
}
console.log(`\n${updated} dosya güncellendi.`);
