#!/usr/bin/env node
/**
 * en-us/collections/{slug}.html → public/theme/king-noor/mirror/collections/{slug}.html
 * (collections/index.html ana liste — build-mirror-home.mjs)
 */
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
const themeRoot = resolve(root, "public/theme/king-noor");
const outDir = resolve(themeRoot, "mirror/collections");
const srcDir = join(mirrorRoot, "en-us/collections");

/** HTTrack kopyaları (all2679.html vb.) hariç — mirror-catalog ile uyumlu */
const COLLECTION_SLUGS = [
  "all",
  "facial-boosters",
  "glow-essentials",
  "luxe-skincare",
  "moisture-magic",
  "natural-glam",
  "pure-by-nature",
];

function main() {
  const resolver = buildAssetResolver(themeRoot);
  mkdirSync(outDir, { recursive: true });
  let built = 0;

  for (const slug of COLLECTION_SLUGS) {
    const src = join(srcDir, `${slug}.html`);
    if (!existsSync(src)) {
      console.warn(`[build-mirror-collections] atlandı (kaynak yok): ${slug}`);
      continue;
    }
    const out = join(outDir, `${slug}.html`);
    const outTr = join(outDir, `${slug}-tr.html`);
    const raw = readFileSync(src, "utf8");
    const html = rewriteMirrorHtml(raw, resolver, `build-mirror-collection:${slug}`);
    writeFileSync(out, html, "utf8");
    writeFileSync(outTr, applyMirrorTurkishStrings(html), "utf8");
    built++;
    console.log(`[build-mirror-collections] ${slug} (${(html.length / 1024).toFixed(0)} KB)`);
  }

  console.log(`[build-mirror-collections] ${built} koleksiyon → ${outDir}`);
}

main();
