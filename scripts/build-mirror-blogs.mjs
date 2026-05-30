#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
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
const outDir = resolve(themeRoot, "mirror/blogs/news");

function findBlogListSrc() {
  const candidates = [
    join(mirrorRoot, "en-us/blogs/news.html"),
    join(mirrorRoot, "blogs/news.html"),
    join(mirrorRoot, "en-us/blogs/news/index.html"),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function findArticleSrcDir() {
  const candidates = [
    join(mirrorRoot, "en-us/blogs/news"),
    join(mirrorRoot, "blogs/news"),
  ];
  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    const hasArticle = readdirSync(dir).some(
      (name) => name.endsWith(".html") && name !== "news.html" && name !== "index.html",
    );
    if (hasArticle) return dir;
  }
  return null;
}

function main() {
  const resolver = buildAssetResolver(themeRoot);
  mkdirSync(outDir, { recursive: true });
  let built = 0;

  const listSrc = findBlogListSrc();
  if (listSrc) {
    const raw = readFileSync(listSrc, "utf8");
    const html = rewriteMirrorHtml(raw, resolver, "build-mirror-blog:list");
    writeFileSync(join(outDir, "index.html"), html, "utf8");
    writeFileSync(join(outDir, "index-tr.html"), applyMirrorTurkishStrings(html), "utf8");
    built++;
    console.log(`[build-mirror-blogs] liste (${(html.length / 1024).toFixed(0)} KB)`);
  } else {
    console.warn("[build-mirror-blogs] blog listesi bulunamadı (en-us/blogs/news.html)");
  }

  const articleDir = findArticleSrcDir();
  if (articleDir) {
    for (const name of readdirSync(articleDir)) {
      if (!name.endsWith(".html")) continue;
      if (name === "news.html" || name === "index.html") continue;
      const slug = name.replace(/\.html$/i, "");
      const raw = readFileSync(join(articleDir, name), "utf8");
      const html = rewriteMirrorHtml(raw, resolver, `build-mirror-blog:${slug}`);
      writeFileSync(join(outDir, `${slug}.html`), html, "utf8");
      writeFileSync(join(outDir, `${slug}-tr.html`), applyMirrorTurkishStrings(html), "utf8");
      built++;
      console.log(`[build-mirror-blogs] yazı: ${slug}`);
    }
  } else {
    console.warn("[build-mirror-blogs] blog yazıları klasörü bulunamadı");
  }

  console.log(`[build-mirror-blogs] ${built} dosya grubu → ${outDir}`);
}

main();
