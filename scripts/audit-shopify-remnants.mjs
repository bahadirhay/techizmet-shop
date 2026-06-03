#!/usr/bin/env node
/** İşlenmiş mirror HTML'de Shopify kalıntısı denetimi */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const samples = [
  "public/theme/techizmet-shop/mirror/index-tr.html",
  "public/theme/techizmet-shop/mirror/index.html",
  "public/theme/techizmet-shop/mirror/collections/all-tr.html",
  "public/theme/techizmet-shop/mirror/products/vitamin-c-hyaluronic-acid-radiant-serum-tr.html",
  "public/_mirror-prebuilt/theme/techizmet-shop/mirror/index-tr.html",
];

const { sanitizeLegacyStoreMirrorHtml } = await import(
  "../src/lib/mirror-html-shopify-strip.ts"
);

const PATTERNS = [
  { name: "myshopify.com URL", re: /myshopify\.com/i },
  {
    name: "shopify.com URL (harici)",
    re: /https?:\/\/[^"'\s]*shopify\.com/i,
  },
  { name: "cdn.shopify.com", re: /cdn\.shopify\.com/i },
  { name: "shopifycloud", re: /shopifycloud/i },
  { name: "shopifycdn", re: /shopifycdn/i },
  { name: "shopifysvc", re: /shopifysvc/i },
  { name: "class shopify-section", re: /class="[^"]*shopify-section/i },
  { name: "id shopify-section", re: /id="shopify-section/i },
  { name: "kn-shopify-stub", re: /kn-shopify-stub/i },
  { name: "shopify-features script", re: /id="shopify-features"/i },
  { name: "HTTrack myshopify comment", re: /Mirrored from[^>]*myshopify/i },
  { name: 'inventory_management:"shopify"', re: /"inventory_management"\s*:\s*"shopify"/i },
];

let failed = 0;

for (const rel of samples) {
  const abs = join(root, rel);
  let raw;
  try {
    raw = readFileSync(abs, "utf8");
  } catch {
    console.log(`[skip] ${rel} (yok)`);
    continue;
  }

  const isPrebuilt = rel.includes("_mirror-prebuilt");
  const sanitized = sanitizeLegacyStoreMirrorHtml(raw);
  const html = sanitized.replace(/<script id="kn-theme-compat-stub">[\s\S]*?<\/script>/gi, "");

  console.log(`\n--- ${rel} ---`);
  let fileOk = true;
  for (const { name, re } of PATTERNS) {
    const m = html.match(re);
    if (m) {
      const idx = m.index ?? 0;
      const snippet = html.slice(Math.max(0, idx - 20), idx + 80).replace(/\s+/g, " ");
      console.log(`  FAIL ${name}: …${snippet}…`);
      fileOk = false;
      failed++;
    }
  }
  if (fileOk) console.log("  OK — kritik kalıntı yok");

  if (!sanitized.includes("kn-theme-compat-stub") && rel.includes("_mirror-prebuilt")) {
    console.log("  WARN — prebuild'de kn-theme-compat-stub yok");
  }
}

if (failed > 0) {
  console.log(`\n[audit-shopify] ${failed} kalıntı bulundu`);
  process.exit(1);
}
console.log("\n[audit-shopify] Tüm örnekler temiz");
