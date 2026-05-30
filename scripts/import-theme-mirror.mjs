#!/usr/bin/env node
/**
 * HTTrack mirror → public/theme/techizmet-shop/
 * CSS, JS, fontlar, ürün/koleksiyon görselleri
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultMirror = "C:/My Web Sites/shop/theking-noor.myshopify.com";
const mirrorRoot = process.env.THEME_MIRROR_PATH?.trim() || defaultMirror;
const outRoot = resolve(root, "public/theme/techizmet-shop");

function copyDirRecursive(src, dest) {
  if (!existsSync(src)) return 0;
  mkdirSync(dest, { recursive: true });
  let n = 0;
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) n += copyDirRecursive(s, d);
    else if (entry.isFile()) {
      mkdirSync(dirname(d), { recursive: true });
      cpSync(s, d);
      n++;
    }
  }
  return n;
}

function main() {
  if (!existsSync(mirrorRoot)) {
    console.error(`Mirror bulunamadı: ${mirrorRoot}`);
    process.exit(1);
  }

  mkdirSync(outRoot, { recursive: true });
  let copied = 0;

  const dirs = [
    "cdn/shop/t/5/assets",
    "cdn/shop/t/5/compiled_assets",
    "cdn/shop/files",
    "cdn/shop/collections",
    "cdn/shop/articles",
    "cdn/fonts",
  ];

  for (const rel of dirs) {
    const n = copyDirRecursive(join(mirrorRoot, rel), join(outRoot, rel));
    copied += n;
    if (n > 0) console.log(`  ${rel}: ${n} dosya`);
  }

  console.log(`[theme:import] Toplam ${copied} dosya → ${outRoot}`);
}

main();
