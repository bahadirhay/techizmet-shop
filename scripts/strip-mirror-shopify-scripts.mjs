#!/usr/bin/env node
/** Mevcut mirror HTML dosyalarından eksik Shopify scriptlerini temizler */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mirrorDir = resolve(root, "public/theme/king-noor/mirror");

function strip(html) {
  let h = html;
  h = h.replace(
    /<script defer="defer" async type="module" src="[^"]*shop-js[^"]*"[^>]*><\/script>/gi,
    "",
  );
  h = h.replace(
    /<script type="module">\s*await import\("cdn\/shopifycloud\/shop-js[^<]*<\/script>/gis,
    "",
  );
  h = h.replace(/<script[^>]*src="[^"]*shopifycloud\/shop-js[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*origin_trials[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*trekkie\.storefront[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*shop_events_listener[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*shopify-perf-kit[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*\/mirror\/cdn[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<link[^>]*model-viewer-ui[^>]*>/gi, "");
  return h;
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.html?$/i.test(name)) files.push(p);
  }
  return files;
}

let n = 0;
for (const file of walk(mirrorDir)) {
  const before = readFileSync(file, "utf8");
  const after = strip(before);
  if (after !== before) {
    writeFileSync(file, after, "utf8");
    n++;
    console.log("[strip]", file.replace(root, ""));
  }
}
console.log(`[strip-mirror-shopify-scripts] ${n} dosya güncellendi`);
