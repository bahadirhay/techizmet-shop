#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyMirrorTurkishStrings,
  buildAssetResolver,
  rewriteMirrorHtml,
} from "./mirror-html.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mirrorRoot =
  process.env.THEME_MIRROR_PATH?.trim() || "C:/My Web Sites/shop/theking-noor.myshopify.com";
const themeRoot = resolve(root, "public/theme/techizmet-shop");
const outDir = resolve(themeRoot, "mirror/products");
const srcDir = join(mirrorRoot, "en-us/products");

function main() {
  const resolver = buildAssetResolver(themeRoot);
  mkdirSync(outDir, { recursive: true });
  const files = readdirSync(srcDir).filter(
    (n) => n.endsWith(".html") && !/^POST/i.test(n)
  );
  let built = 0;

  for (const file of files) {
    const slug = file.replace(/\.html$/i, "");
    const src = join(srcDir, file);
    const out = join(outDir, `${slug}.html`);
    const outTr = join(outDir, `${slug}-tr.html`);
    const raw = readFileSync(src, "utf8");
    const html = rewriteMirrorHtml(raw, resolver, `build-mirror-product:${slug}`);
    writeFileSync(out, html, "utf8");
    writeFileSync(outTr, applyMirrorTurkishStrings(html), "utf8");
    built++;
    console.log(`[build-mirror-products] ${slug} (${(html.length / 1024).toFixed(0)} KB)`);
  }

  console.log(`[build-mirror-products] ${built} ürün → ${outDir}`);
}

main();
