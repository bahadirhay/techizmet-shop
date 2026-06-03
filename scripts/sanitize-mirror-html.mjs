#!/usr/bin/env node
/** Tüm mirror HTML + tema JS — Shopify kalıntılarını temizle */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mirrorDir = join(root, "public/theme/techizmet-shop/mirror");
const themeAssets = join(root, "public/theme/techizmet-shop/cdn/shop/t/5/assets");

const { sanitizeLegacyStoreMirrorHtml } = await import(
  "../src/lib/mirror-html-shopify-strip.ts"
);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.html?$/i.test(name)) files.push(p);
  }
  return files;
}

function patchThemeJs(file) {
  let h = readFileSync(file, "utf8");
  const before = h;
  h = h.replace(/shopify-section/g, "kn-mirror-section");
  if (h !== before) {
    writeFileSync(file, h, "utf8");
    return true;
  }
  return false;
}

let htmlN = 0;
for (const file of walk(mirrorDir)) {
  const before = readFileSync(file, "utf8");
  const after = sanitizeLegacyStoreMirrorHtml(before);
  if (after !== before) {
    writeFileSync(file, after, "utf8");
    htmlN++;
    console.log("[sanitize]", file.replace(root, ""));
  }
}

let jsN = 0;
for (const name of readdirSync(themeAssets)) {
  if (!/\.js$/i.test(name)) continue;
  const p = join(themeAssets, name);
  if (patchThemeJs(p)) {
    jsN++;
    console.log("[theme-js]", name);
  }
}

console.log(`[sanitize-mirror-html] ${htmlN} HTML, ${jsN} JS güncellendi`);
