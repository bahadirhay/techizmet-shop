import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { mirrorVitrinApiSrc, prebuiltMirrorPublicUrl } from "@/lib/mirror-iframe-src";
import {
  hasPrebuiltMirrorHtml,
  preferPrebuiltMirrorHtml,
} from "@/lib/mirror-prebuilt-io";
import { resolveStoreMirrorIframeSrc } from "@/lib/mirror-prebuilt-resolve";
import { toBrandedMirrorSrc } from "@/lib/mirror-iframe-src";
import type { ShopLocale } from "@/lib/i18n/locale";

const mirrorRoot = () => join(process.cwd(), "public/theme/techizmet-shop/mirror");
const productRoot = () => join(mirrorRoot(), "products");
const collectionRoot = () => join(mirrorRoot(), "collections");

export function mirrorProductHtmlExists(slug: string) {
  return existsSync(join(productRoot(), `${slug}.html`));
}

export function mirrorCollectionHtmlExists(slug: string) {
  return existsSync(join(collectionRoot(), `${slug}.html`));
}

/** Yeni admin koleksiyonları için uygun bir detail şablonu seç */
export function resolveMirrorCollectionTemplateSlug(slug: string): string | null {
  if (mirrorCollectionHtmlExists(slug)) return slug;

  for (const preferred of [
    "facial-boosters",
    "glow-essentials",
    "luxe-skincare",
    "moisture-magic",
    "natural-glam",
    "pure-by-nature",
  ]) {
    if (mirrorCollectionHtmlExists(preferred)) return preferred;
  }

  try {
    const first = readdirSync(collectionRoot())
      .find((name) => name.endsWith(".html") && !name.endsWith("-tr.html") && name !== "all.html" && name !== "index.html");
    return first ? first.replace(/\.html$/i, "") : null;
  } catch {
    return null;
  }
}

/** Yeni admin ürünleri için uygun bir PDP şablonu seç */
export function resolveMirrorProductTemplateSlug(slug: string): string | null {
  if (mirrorProductHtmlExists(slug)) return slug;

  for (const preferred of [
    "spectrum-sunscreen-spf-50",
    "micro-sculpting-moisturizer",
    "hydrasoft-face-moisturizer",
    "hydrasilk-skin-reviving-cleanser",
    "vitamin-c-hyaluronic-acid-radiant-serum",
  ]) {
    if (mirrorProductHtmlExists(preferred)) return preferred;
  }

  try {
    const first = readdirSync(productRoot())
      .find((name) => name.endsWith(".html") && !name.endsWith("-tr.html") && name !== "index.html");
    return first ? first.replace(/\.html$/i, "") : null;
  } catch {
    return null;
  }
}

export function mirrorStaticPageHtmlExists(slug: string) {
  return existsSync(join(mirrorRoot(), "pages", `${slug}.html`));
}

const blogNewsRoot = () => join(mirrorRoot(), "blogs/news");

export function mirrorBlogListHtmlExists() {
  return existsSync(join(blogNewsRoot(), "index.html"));
}

export function mirrorBlogArticleHtmlExists(slug: string) {
  return existsSync(join(blogNewsRoot(), `${slug}.html`));
}

/** DB enjeksiyonu için sabit şablon — slug başına klon dosyalar skincare kalıntısı taşır */
export const BLOG_ARTICLE_MIRROR_TEMPLATE_SLUG =
  "how-to-build-the-perfect-skincare-routine-for-your-skin-type";

/** Yazı şablonu — her zaman tek şablon + blogSlug ile DB içeriği */
export function resolveMirrorBlogArticleTemplateSlug(_slug: string): string | null {
  if (mirrorBlogArticleHtmlExists(BLOG_ARTICLE_MIRROR_TEMPLATE_SLUG)) {
    return BLOG_ARTICLE_MIRROR_TEMPLATE_SLUG;
  }
  try {
    const first = readdirSync(blogNewsRoot()).find(
      (name) =>
        name.endsWith(".html") &&
        !name.endsWith("-tr.html") &&
        name !== "index.html" &&
        name !== "index-tr.html" &&
        name !== "POST.html",
    );
    return first ? first.replace(/\.html$/i, "") : null;
  } catch {
    return null;
  }
}

export function blogArticleMirrorFileRel(slug: string, locale: ShopLocale): string {
  return locale === "tr"
    ? `theme/techizmet-shop/mirror/blogs/news/${slug}-tr.html`
    : `theme/techizmet-shop/mirror/blogs/news/${slug}.html`;
}

/** Blog yazısı iframe — prod: slug başına prebuilt; dev: şablon + blogSlug */
export function productMirrorFileRel(slug: string, locale: ShopLocale): string {
  return locale === "tr"
    ? `theme/techizmet-shop/mirror/products/${slug}-tr.html`
    : `theme/techizmet-shop/mirror/products/${slug}.html`;
}

/** Ürün PDP iframe — prod: slug başına prebuilt */
export function collectionMirrorFileRel(slug: string, locale: ShopLocale): string {
  const file = locale === "tr" ? `${slug}-tr.html` : `${slug}.html`;
  return `theme/techizmet-shop/mirror/collections/${file}`;
}

/** Kategori listesi — deploy prebuild dosya yolu */
export function categoryCollectionMirrorFileRel(categorySlug: string, locale: ShopLocale): string {
  const safe = categorySlug.trim().replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
  const file = locale === "tr" ? `category-${safe}-tr.html` : `category-${safe}.html`;
  return `theme/techizmet-shop/mirror/collections/${file}`;
}

/** Kategori listesi — prod: statik prebuilt; dev: API (yavaş, yedek) */
export function buildCategoryCollectionMirrorSrc(
  collectionSlug: string,
  locale: ShopLocale,
  categorySlug: string,
  page = 1,
  title?: string,
): string {
  const rel = categoryCollectionMirrorFileRel(categorySlug, locale);
  if (page === 1 && preferPrebuiltMirrorHtml(rel) && hasPrebuiltMirrorHtml(rel)) {
    return prebuiltMirrorPublicUrl(rel);
  }
  const q = new URLSearchParams({
    category: categorySlug.trim(),
    slug: collectionSlug,
    page: String(page),
  });
  if (title?.trim()) q.set("title", title.trim());
  return `/api/vitrin/collection-html?${q.toString()}`;
}

/** Koleksiyon / kategori listesi iframe — prod: slug başına prebuilt */
export function buildCollectionMirrorSrc(
  slug: string,
  locale: ShopLocale,
  templateSlug: string,
  categorySlug?: string,
  page = 1,
  title?: string,
): string {
  if (categorySlug?.trim()) {
    return buildCategoryCollectionMirrorSrc(slug, locale, categorySlug, page, title);
  }
  const diskSlug = mirrorCollectionHtmlExists(slug) ? slug : templateSlug;
  return resolveStoreMirrorIframeSrc(collectionMirrorFileRel(diskSlug, locale));
}

export function buildProductMirrorSrc(slug: string, locale: ShopLocale, templateSlug: string): string {
  const outRel = productMirrorFileRel(slug, locale);
  if (preferPrebuiltMirrorHtml(outRel) && hasPrebuiltMirrorHtml(outRel)) {
    return resolveStoreMirrorIframeSrc(outRel);
  }

  const diskSlug = mirrorProductHtmlExists(slug) ? slug : templateSlug;
  const sourceRel = productMirrorFileRel(diskSlug, locale);

  if (diskSlug === slug) {
    return resolveStoreMirrorIframeSrc(sourceRel);
  }

  return mirrorVitrinApiSrc(sourceRel, undefined, { productSlug: slug });
}

export function buildBlogArticleMirrorSrc(slug: string, locale: ShopLocale): string | null {
  const templateSlug = resolveMirrorBlogArticleTemplateSlug(slug);
  if (!templateSlug) return null;

  const outRel = blogArticleMirrorFileRel(slug, locale);
  if (preferPrebuiltMirrorHtml(outRel) && hasPrebuiltMirrorHtml(outRel)) {
    return resolveStoreMirrorIframeSrc(outRel);
  }

  return mirrorVitrinApiSrc(blogArticleMirrorFileRel(templateSlug, locale), undefined, {
    blogSlug: slug,
  });
}
