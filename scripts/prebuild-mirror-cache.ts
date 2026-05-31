/**
 * Deploy öncesi mirror HTML — menü, fiyat, marka enjekte edilmiş statik dosyalar.
 * Vercel build: DATABASE_URL + STORE_SITE_SLUG gerekir.
 */
import "dotenv/config";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { buildMirrorHtmlCore } from "../src/lib/mirror-html-processor";
import { prebuiltMirrorAbs } from "../src/lib/mirror-prebuilt";
import { VITRIN_PAGES } from "../src/lib/mirror-vitrin-pages";
import { prisma } from "../src/lib/prisma";

const PRODUCT_DIR = join(process.cwd(), "public/theme/techizmet-shop/mirror/products");
const SKIP_PRODUCT_FILES = new Set(["POST.html", "POST-tr.html"]);

async function writePrebuilt(normalized: string, html: string) {
  const abs = prebuiltMirrorAbs(normalized);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, html, "utf8");
}

async function main() {
  const slug = process.env.STORE_SITE_SLUG?.trim() || "demo";
  const site = await prisma.storeSite.findUnique({ where: { slug } });
  if (!site) {
    console.warn(`[mirror:prebuild] Site yok (slug=${slug}) — atlanıyor`);
    return;
  }

  let count = 0;

  for (const page of VITRIN_PAGES) {
    for (const locale of ["tr", "en"] as const) {
      const normalized = page.mirrorFileRel(locale);
      const html = await buildMirrorHtmlCore({
        normalized,
        locale,
        siteId: site.id,
        siteName: site.name,
        pageKey: page.key,
      });
      await writePrebuilt(normalized, html);
      count += 1;
      console.log(`[mirror:prebuild] ${normalized}`);
    }
  }

  const productFiles = await readdir(PRODUCT_DIR);
  for (const file of productFiles) {
    if (!file.endsWith(".html") || SKIP_PRODUCT_FILES.has(file)) continue;
    const normalized = `theme/techizmet-shop/mirror/products/${file}`;
    const locale = file.endsWith("-tr.html") ? "tr" : "en";
    const html = await buildMirrorHtmlCore({
      normalized,
      locale,
      siteId: site.id,
      siteName: site.name,
    });
    await writePrebuilt(normalized, html);
    count += 1;
    console.log(`[mirror:prebuild] ${normalized}`);
  }

  console.log(`[mirror:prebuild] Tamam — ${count} dosya`);
}

main()
  .catch((e) => {
    console.error("[mirror:prebuild] Hata:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
