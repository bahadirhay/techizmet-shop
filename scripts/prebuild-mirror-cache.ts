/**
 * Deploy öncesi mirror HTML — menü, fiyat, marka enjekte edilmiş statik dosyalar.
 * Vercel build: DATABASE_URL + STORE_SITE_SLUG (Production + Build) gerekir.
 */
import "dotenv/config";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { listPublishedBlogPosts } from "../src/lib/blog/blog-posts-server";
import { applyCartShellForPrebuild } from "../src/lib/mirror-cart-page";
import { buildMirrorHtmlCore } from "../src/lib/mirror-html-processor";
import {
  applyCollectionCatalogToMirrorHtml,
  buildCategoryCollectionHtmlForPrebuild,
} from "../src/lib/mirror-collection-catalog-html";
import { loadCollectionCatalogCore } from "../src/lib/mirror-collection-catalog-data";
import {
  blogArticleMirrorFileRel,
  categoryCollectionMirrorFileRel,
  collectionMirrorFileRel,
  productMirrorFileRel,
  resolveMirrorBlogArticleTemplateSlug,
  resolveMirrorCollectionTemplateSlug,
  resolveMirrorProductTemplateSlug,
} from "../src/lib/mirror-html-path";
import { prebuiltMirrorAbs } from "../src/lib/mirror-prebuilt-io";
import { prebuiltMirrorPublicUrl } from "../src/lib/mirror-iframe-src";
import { VITRIN_PAGES } from "../src/lib/mirror-vitrin-pages";
import { prisma } from "../src/lib/prisma";

const MIRROR_THEME = "theme/techizmet-shop/mirror";
const PRODUCT_DIR = join(process.cwd(), `public/${MIRROR_THEME}/products`);
const BLOG_DIR = join(process.cwd(), `public/${MIRROR_THEME}/blogs/news`);
const COLLECTION_DIR = join(process.cwd(), `public/${MIRROR_THEME}/collections`);
const SKIP_PRODUCT_FILES = new Set(["POST.html", "POST-tr.html"]);
const SKIP_BLOG_FILES = new Set(["index.html", "index-tr.html", "POST.html", "POST-tr.html"]);
const SKIP_COLLECTION_FILES = new Set([
  "index.html",
  "index-tr.html",
  "all.html",
  "all-tr.html",
]);
const MANIFEST_PATH = join(process.cwd(), "public/_mirror-prebuilt/manifest.json");

async function writePrebuilt(normalized: string, html: string) {
  const abs = prebuiltMirrorAbs(normalized);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, html, "utf8");
}

async function main() {
  const slug = process.env.STORE_SITE_SLUG?.trim() || "demo";
  const hasDb = Boolean(process.env.DATABASE_URL?.trim());

  console.log(`[mirror:prebuild] slug=${slug} DATABASE_URL=${hasDb ? "ok" : "EKSIK"}`);

  if (!hasDb || process.env.SKIP_MIRROR_PREBUILD === "1") {
    console.warn(
      "[mirror:prebuild] Atlandi — DATABASE_URL yok veya SKIP_MIRROR_PREBUILD=1 (mevcut _mirror-prebuilt kullanilir).",
    );
    return;
  }

  const site = await prisma.storeSite.findUnique({ where: { slug } });
  if (!site) {
    console.error(
      `[mirror:prebuild] Mağaza bulunamadı (slug="${slug}"). Vercel'de STORE_SITE_SLUG doğru mu?`,
    );
    process.exit(1);
  }

  const written: string[] = [];
  const prebuiltKeys = new Set<string>();

  async function prebuildOnce(normalized: string, build: () => Promise<string>) {
    if (prebuiltKeys.has(normalized)) return;
    const html = await build();
    await writePrebuilt(normalized, html);
    prebuiltKeys.add(normalized);
    written.push(normalized);
    console.log(`[mirror:prebuild] ${normalized}`);
  }

  for (const locale of ["tr", "en"] as const) {
    const cartRel = `theme/techizmet-shop/mirror/cart/index${locale === "tr" ? "-tr" : ""}.html`;
    await prebuildOnce(cartRel, async () => {
      const base = await buildMirrorHtmlCore({
        normalized: cartRel,
        locale,
        siteId: site.id,
        siteName: site.name,
      });
      return applyCartShellForPrebuild(base, locale);
    });
  }

  for (const locale of ["tr", "en"] as const) {
    const checkoutRel = `theme/techizmet-shop/mirror/checkout/index${locale === "tr" ? "-tr" : ""}.html`;
    await prebuildOnce(checkoutRel, () =>
      buildMirrorHtmlCore({
        normalized: checkoutRel,
        locale,
        siteId: site.id,
        siteName: site.name,
      }),
    );
  }

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
      written.push(normalized);
      console.log(`[mirror:prebuild] ${normalized}`);
    }
  }

  // Ürün şablon dosyalarını doğrudan public route olarak prebuild etme.
  // Anatolian Paw ürün sayfaları DB'deki published storeProduct kayıtlarından üretilir.
  // Aksi halde skincare şablonları (örn. spectrum-sunscreen-spf-50) olmayan ürün route'u olarak canlanır.

  const blogFiles = await readdir(BLOG_DIR);
  for (const file of blogFiles) {
    if (!file.endsWith(".html") || SKIP_BLOG_FILES.has(file)) continue;
    const normalized = `${MIRROR_THEME}/blogs/news/${file}`;
    const locale = file.endsWith("-tr.html") ? "tr" : "en";
    const slug = file.replace(/-tr\.html$/i, "").replace(/\.html$/i, "");
    await prebuildOnce(normalized, () =>
      buildMirrorHtmlCore({
        normalized,
        locale,
        siteId: site.id,
        siteName: site.name,
        blogSlug: slug,
      }),
    );
  }

  const publishedPosts = await listPublishedBlogPosts(site.id);
  for (const post of publishedPosts) {
    const templateSlug = resolveMirrorBlogArticleTemplateSlug(post.slug);
    if (!templateSlug) continue;

    for (const locale of ["tr", "en"] as const) {
      const outRel = blogArticleMirrorFileRel(post.slug, locale);
      const sourceRel = blogArticleMirrorFileRel(templateSlug, locale);
      await prebuildOnce(outRel, () =>
        buildMirrorHtmlCore({
          normalized: sourceRel,
          locale,
          siteId: site.id,
          siteName: site.name,
          blogSlug: post.slug,
        }),
      );
    }
  }

  const publishedProducts = await prisma.storeProduct.findMany({
    where: { siteId: site.id, published: true },
    select: { slug: true },
  });
  const publishedProductFiles = new Set(
    publishedProducts.flatMap((product) => [
      `${product.slug}-tr.html`,
      `${product.slug}.html`,
    ]),
  );
  const prebuiltProductsDir = prebuiltMirrorAbs(`${MIRROR_THEME}/products/index.html`).replace(/index\.html$/i, "");
  try {
    const oldPrebuiltProducts = await readdir(prebuiltProductsDir);
    for (const file of oldPrebuiltProducts) {
      if (!file.endsWith(".html") || publishedProductFiles.has(file)) continue;
      await rm(join(prebuiltProductsDir, file), { force: true });
      console.log(`[mirror:prebuild] removed stale product ${file}`);
    }
  } catch {
    // prebuilt products dir yoksa sorun değil
  }

  for (const product of publishedProducts) {
    const templateSlug = resolveMirrorProductTemplateSlug(product.slug);
    if (!templateSlug) continue;

    for (const locale of ["tr", "en"] as const) {
      const outRel = productMirrorFileRel(product.slug, locale);
      const sourceRel = productMirrorFileRel(templateSlug, locale);
      await prebuildOnce(outRel, () =>
        buildMirrorHtmlCore({
          normalized: sourceRel,
          locale,
          siteId: site.id,
          siteName: site.name,
          productSlug: product.slug,
        }),
      );
    }
  }

  const collectionFiles = await readdir(COLLECTION_DIR);
  for (const file of collectionFiles) {
    if (!file.endsWith(".html") || SKIP_COLLECTION_FILES.has(file)) continue;
    const normalized = `${MIRROR_THEME}/collections/${file}`;
    const locale = file.endsWith("-tr.html") ? "tr" : "en";
    await prebuildOnce(normalized, () =>
      buildMirrorHtmlCore({
        normalized,
        locale,
        siteId: site.id,
        siteName: site.name,
      }),
    );
  }

  const publishedCollections = await prisma.storeCollection.findMany({
    where: { siteId: site.id, published: true },
    select: { slug: true },
  });
  for (const col of publishedCollections) {
    const templateSlug = resolveMirrorCollectionTemplateSlug(col.slug);
    if (!templateSlug) continue;
    for (const locale of ["tr", "en"] as const) {
      const outRel = collectionMirrorFileRel(col.slug, locale);
      const sourceRel = collectionMirrorFileRel(templateSlug, locale);
      await prebuildOnce(outRel, () =>
        buildMirrorHtmlCore({
          normalized: sourceRel,
          locale,
          siteId: site.id,
          siteName: site.name,
        }),
      );
    }
  }

  for (const locale of ["tr", "en"] as const) {
    const normalized = collectionMirrorFileRel("all", locale);
    await prebuildOnce(normalized, async () => {
      const base = await buildMirrorHtmlCore({
        normalized,
        locale,
        siteId: site.id,
        siteName: site.name,
      });
      const catalog = await loadCollectionCatalogCore(site.id, "all", locale, undefined, 1);
      return applyCollectionCatalogToMirrorHtml(base, catalog, locale, 1);
    });
  }

  const storeCategories = await prisma.storeCategory.findMany({
    where: { siteId: site.id, active: true },
    select: { slug: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  const allBaseByLocale: Partial<Record<"tr" | "en", string>> = {};
  for (const locale of ["tr", "en"] as const) {
    const rel = collectionMirrorFileRel("all", locale);
    const abs = prebuiltMirrorAbs(rel);
    allBaseByLocale[locale] = await readFile(abs, "utf8");
  }

  const categoryBatchSize = 4;
  console.log(
    `[mirror:prebuild] ${storeCategories.length} kategori × 2 dil (all.html tabanlı, batch=${categoryBatchSize})`,
  );
  for (const locale of ["tr", "en"] as const) {
    const base = allBaseByLocale[locale];
    if (!base) {
      throw new Error(`all.html prebuilt eksik: ${locale}`);
    }
    for (let i = 0; i < storeCategories.length; i += categoryBatchSize) {
      const batch = storeCategories.slice(i, i + categoryBatchSize);
      await Promise.all(
        batch.map(async (cat) => {
          const outRel = categoryCollectionMirrorFileRel(cat.slug, locale);
          const t0 = Date.now();
          await prebuildOnce(outRel, () =>
            buildCategoryCollectionHtmlForPrebuild(
              site.id,
              site.name,
              locale,
              cat.slug,
              1,
              base,
            ),
          );
          console.log(
            `[mirror:prebuild] ${outRel} (${Date.now() - t0}ms)`,
          );
        }),
      );
    }
  }

  if (written.length < 10) {
    console.error(`[mirror:prebuild] Çok az dosya (${written.length}) — build iptal.`);
    process.exit(1);
  }

  await mkdir(dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(
    MANIFEST_PATH,
    JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        siteSlug: slug,
        count: written.length,
        sample: prebuiltMirrorPublicUrl(written[0]!),
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`[mirror:prebuild] Tamam — ${written.length} dosya`);
}

main()
  .catch((e) => {
    console.error("[mirror:prebuild] Hata:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
