#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
const outDir = resolve(themeRoot, "mirror/pages");
const srcDir = join(mirrorRoot, "en-us/pages");

const PAGE_SLUGS = ["about", "contact", "faq"];

function main() {
  const resolver = buildAssetResolver(themeRoot);
  mkdirSync(outDir, { recursive: true });
  let built = 0;

  for (const slug of PAGE_SLUGS) {
    const src = join(srcDir, `${slug}.html`);
    if (!existsSync(src)) {
      console.warn(`[build-mirror-pages] atlandı: ${slug}`);
      continue;
    }
    const out = join(outDir, `${slug}.html`);
    const outTr = join(outDir, `${slug}-tr.html`);
    const raw = readFileSync(src, "utf8");
    const html = rewriteMirrorHtml(raw, resolver, `build-mirror-page:${slug}`);
    writeFileSync(out, html, "utf8");
    writeFileSync(outTr, applyMirrorTurkishStrings(html), "utf8");
    built++;
    console.log(`[build-mirror-pages] ${slug} (${(html.length / 1024).toFixed(0)} KB)`);
  }

  console.log(`[build-mirror-pages] ${built} sayfa → ${outDir}`);
}

main();
