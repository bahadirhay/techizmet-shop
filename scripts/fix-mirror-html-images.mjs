#!/usr/bin/env node
/**
 * Tüm mirror HTML'deki CDN görsel yollarını diskteki gerçek dosyalarla eşleştirir.
 * Kullanım: npx tsx scripts/fix-mirror-html-images.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { fixMirrorCdnPathsInHtml } from "../src/lib/mirror-cdn-assets.ts";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const mirrorRoot = join(root, "public/theme/techizmet-shop/mirror");

function walkHtml(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkHtml(p, acc);
    else if (name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

let n = 0;
for (const file of walkHtml(mirrorRoot)) {
  const before = readFileSync(file, "utf8");
  const after = fixMirrorCdnPathsInHtml(before);
  if (after !== before) {
    writeFileSync(file, after, "utf8");
    n++;
    console.log("✓", relative(root, file));
  }
}
console.log(`\n${n} HTML dosyası güncellendi.`);
