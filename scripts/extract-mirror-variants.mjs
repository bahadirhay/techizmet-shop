#!/usr/bin/env node
/**
 * HTTrack ürün + koleksiyon HTML → seed JSON (varyantlar, koleksiyon eşlemesi)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAssetResolver } from "./mirror-html.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const themeRoot = resolve(root, "public/theme/king-noor");
const mirrorRoot =
  process.env.THEME_MIRROR_PATH?.trim() || "C:/My Web Sites/shop/theking-noor.myshopify.com";
const productsDir = join(mirrorRoot, "en-us/products");
const builtProductsDir = resolve(themeRoot, "mirror/products");
const assetResolver = buildAssetResolver(themeRoot);
const collectionsDir = join(mirrorRoot, "en-us/collections");
const builtCollectionsDir = resolve(root, "public/theme/king-noor/mirror/collections");
const variantsOut = resolve(root, "src/lib/catalog/mirror-product-variants.json");
const collectionsOut = resolve(root, "src/lib/catalog/mirror-product-collections.json");

const httrackDup = /[0-9a-f]{4,}\.html$/i;

function optionName(variants) {
  if (variants.length <= 1) return null;
  if (variants.some((v) => v.label.includes("/"))) return "Volume & Shade";
  const first = variants[0].label;
  if (/ml|ML|^\d+g$/i.test(first)) return "Volume";
  return "Shade";
}

function extractTitle(html, slug) {
  const m = html.match(/<title>\s*([^<]+)/);
  if (!m) return slug;
  return m[1].replace(/\s*&ndash;.*$/i, "").trim();
}

function extractCompareAt(html) {
  const m = html.match(/"compare_at_price":(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function extractImageFile(html) {
  const m =
    html.match(/property="og:image"[^>]*content="[^"]*\/files\/([^"?]+)/i) ||
    html.match(/property="og:image:secure_url"[^>]*content="[^"]*\/files\/([^"?]+)/i);
  if (!m) return null;
  const bare = m[1].split("?")[0];
  const actual = assetResolver.pickBest("cdn/shop/files", bare);
  return actual || bare;
}

function htmlToPlain(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractAccordionBody(html, heading) {
  const re = new RegExp(
    `product-accordion--heading-text h6">${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>[\\s\\S]*?product-accordion--content-body rte">([\\s\\S]*?)</div>\\s*</div>\\s*</details>`,
    "i",
  );
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function extractShortDescription(html) {
  const m = html.match(/class="product--description[^"]*"[^>]*>\s*([^<]+)/i);
  if (m) return m[1].trim();
  const descHtml = extractAccordionBody(html, "Description");
  if (descHtml) return htmlToPlain(descHtml).slice(0, 500);
  const meta = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  return meta ? meta[1].trim() : null;
}

function readProductHtml(slug) {
  const built = join(builtProductsDir, `${slug}.html`);
  if (existsSync(built)) return readFileSync(built, "utf8");
  const src = join(productsDir, `${slug}.html`);
  if (existsSync(src)) return readFileSync(src, "utf8");
  return null;
}

function extractProductHandle(html) {
  const m = html.match(/var meta = (\{[\s\S]*?\});/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]).product?.handle ?? null;
  } catch {
    return null;
  }
}

function parseCollectionMeta(html) {
  const m = html.match(/var meta = (\{[\s\S]*?\});/);
  if (!m) return [];
  const meta = JSON.parse(m[1]);
  return (meta.products || []).map((p) => p.handle);
}

/** @type {Record<string, string[]>} */
const collectionMap = {};

function addToCollection(handle, colSlug) {
  if (!collectionMap[handle]) collectionMap[handle] = [];
  if (!collectionMap[handle].includes(colSlug)) collectionMap[handle].push(colSlug);
}

for (const file of readdirSync(collectionsDir)) {
  if (!file.endsWith(".html") || /^POST/i.test(file)) continue;
  const colSlug = file.replace(/\.html$/i, "").replace(/[0-9a-f]{4,}$/i, "");
  if (!colSlug || colSlug === "POST") continue;
  const html = readFileSync(join(collectionsDir, file), "utf8");
  for (const handle of parseCollectionMeta(html)) addToCollection(handle, colSlug);
}

if (existsSync(builtCollectionsDir)) {
  for (const file of readdirSync(builtCollectionsDir)) {
    if (!file.endsWith(".html") || file.includes("-tr.html")) continue;
    const colSlug = file.replace(/\.html$/i, "").replace(/-tr$/i, "");
    if (colSlug === "index") continue;
    const html = readFileSync(join(builtCollectionsDir, file), "utf8");
    for (const handle of parseCollectionMeta(html)) addToCollection(handle, colSlug);
  }
}

/** @type {Record<string, unknown>} */
const variantsOutData = {};

const productSlugs = new Set();
for (const file of readdirSync(productsDir)) {
  if (!file.endsWith(".html") || /^POST/i.test(file) || httrackDup.test(file)) continue;
  productSlugs.add(file.replace(/\.html$/i, ""));
}
if (existsSync(builtProductsDir)) {
  for (const file of readdirSync(builtProductsDir)) {
    if (!file.endsWith(".html") || file.endsWith("-tr.html")) continue;
    productSlugs.add(file.replace(/\.html$/i, ""));
  }
}

for (const slug of productSlugs) {
  const html = readProductHtml(slug);
  if (!html) continue;
  const handle = extractProductHandle(html);
  if (handle && handle !== slug) {
    console.warn(`[extract] slug/handle uyumsuz: ${slug} → ${handle}, atlanıyor`);
    continue;
  }
  const metaM = html.match(/var meta = (\{[\s\S]*?\});/);
  if (!metaM) continue;
  const meta = JSON.parse(metaM[1]);
  const p = meta.product;
  if (!p?.variants?.length) continue;
  const compareAtMinor = p.compare_at_price ?? extractCompareAt(html);
  const imageFile = extractImageFile(html);
  const variants = p.variants.map((v, i) => ({
    label: v.public_title,
    priceMinor: v.price,
    compareAtMinor: compareAtMinor,
    isDefault: i === 0,
  }));
  const descriptionHtml = extractAccordionBody(html, "Description");
  const keyFeaturesHtml = extractAccordionBody(html, "Key Features");
  const howToUseHtml = extractAccordionBody(html, "How to Use");
  variantsOutData[slug] = {
    title: extractTitle(html, slug),
    priceMinor: variants[0].priceMinor,
    compareAtMinor,
    imageFile,
    imageUrl: imageFile ? `/theme/king-noor/cdn/shop/files/${imageFile}` : null,
    description: extractShortDescription(html),
    descriptionHtml,
    keyFeaturesHtml,
    howToUseHtml,
    variantOptionName: optionName(variants),
    variants,
  };
}

writeFileSync(variantsOut, JSON.stringify(variantsOutData, null, 2), "utf8");
writeFileSync(collectionsOut, JSON.stringify(collectionMap, null, 2), "utf8");
console.log(
  `[extract-mirror-variants] ${Object.keys(variantsOutData).length} ürün, ${Object.keys(collectionMap).length} koleksiyon eşlemesi`
);
