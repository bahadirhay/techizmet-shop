#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
const outDir = resolve(themeRoot, "mirror");

const pages = [
  {
    src: join(mirrorRoot, "en-us.html"),
    out: join(outDir, "index.html"),
    outTr: join(outDir, "index-tr.html"),
    label: "build-mirror-home",
  },
  {
    src: join(mirrorRoot, "en-us/collections.html"),
    out: join(outDir, "collections/index.html"),
    outTr: join(outDir, "collections/index-tr.html"),
    label: "build-mirror-collections",
  },
];

function main() {
  const resolver = buildAssetResolver(themeRoot);
  for (const { src, out, outTr, label } of pages) {
    const raw = readFileSync(src, "utf8");
    mkdirSync(dirname(out), { recursive: true });
    const html = rewriteMirrorHtml(raw, resolver, label);
    writeFileSync(out, html, "utf8");
    writeFileSync(outTr, applyMirrorTurkishStrings(html), "utf8");
    console.log(`[${label}] ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`[${label}] ${outTr} (TR)`);
  }
}

main();
