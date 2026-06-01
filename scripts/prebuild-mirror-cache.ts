/**
 * Deploy öncesi mirror HTML — menü, fiyat, marka enjekte edilmiş statik dosyalar.
 * Vercel build: DATABASE_URL + STORE_SITE_SLUG (Production + Build) gerekir.
 */
import "dotenv/config";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { listPublishedBlogPosts } from "../src/lib/blog/blog-posts-server";
import { buildMirrorHtmlCore } from "../src/lib/mirror-html-processor";
import { buildCategoryCollectionHtmlForPrebuild } from "../src/lib/mirror-collection-html-server";
import {
  blogArticleMirrorFileRel,
  categoryCollectionMirrorFileRel,
  collectionMirrorFileRel,
  productMirrorFileRel,
  resolveMirrorBlogArticleTemplateSlug,
  resolveMirrorCollectionTemplateSlug,
  resolveMirrorProductTemplateSlug,
} from "../src/lib/mirror-html-path";
import { prebuiltMirrorAbs, prebuiltMirrorPublicUrl } from "../src/lib/mirror-prebuilt";
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

  if (!hasDb) {
    console.error("[mirror:prebuild] DATABASE_URL tanımlı değil — Vercel env (Build+Production) kontrol edin.");
    process.exit(1);
  }

  const site = await prisma.storeSite.findUnique({ where: { slug } });
  if (!site) {
    console.error(
      `[mirror:prebuild] Mağaza bulunamadı (slug="${slug}"). Vercel'de STORE_SITE_SLUG doğru mu?`,
    );
    process.exit(1);
  }

  const written: string[] = [];

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

  const productFiles = await readdir(PRODUCT_DIR);
  for (const file of productFiles) {
    if (!file.endsWith(".html") || SKIP_PRODUCT_FILES.has(file)) continue;
    const normalized = `${MIRROR_THEME}/products/${file}`;
    const locale = file.endsWith("-tr.html") ? "tr" : "en";
    const html = await buildMirrorHtmlCore({
      normalized,
      locale,
      siteId: site.id,
      siteName: site.name,
    });
    await writePrebuilt(normalized, html);
    written.push(normalized);
    console.log(`[mirror:prebuild] ${normalized}`);
  }

  const prebuiltKeys = new Set(written);

  async function prebuildOnce(normalized: string, build: () => Promise<string>) {
    if (prebuiltKeys.has(normalized)) return;
    const html = await build();
    await writePrebuilt(normalized, html);
    prebuiltKeys.add(normalized);
    written.push(normalized);
    console.log(`[mirror:prebuild] ${normalized}`);
  }

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
    await prebuildOnce(normalized, () =>
      buildMirrorHtmlCore({
        normalized,
        locale,
        siteId: site.id,
        siteName: site.name,
      }),
    );
  }

  const storeCategories = await prisma.storeCategory.findMany({
    where: { siteId: site.id, active: true },
    select: { slug: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  for (const cat of storeCategories) {
    for (const locale of ["tr", "en"] as const) {
      const outRel = categoryCollectionMirrorFileRel(cat.slug, locale);
      await prebuildOnce(outRel, () =>
        buildCategoryCollectionHtmlForPrebuild(site.id, site.name, locale, cat.slug),
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
