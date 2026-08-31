import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { prebuiltMirrorPublicUrl } from "@/lib/mirror-iframe-src";
import {
  hasPrebuiltMirrorHtml,
  preferPrebuiltMirrorHtml,
} from "@/lib/mirror-prebuilt-io";
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

/** Admin ürün PDP şablonu — bilinmeyen slug'lar rastgele dosyaya düşmesin (SEO soft-404) */
export const DEFAULT_PRODUCT_MIRROR_TEMPLATE_SLUG = "24hr-smudge-proof-mascara";

/** Yeni admin koleksiyonları için uygun bir detail şablonu seç */
export function resolveMirrorCollectionTemplateSlug(slug: string): string | null {
  if (mirrorCollectionHtmlExists(slug)) return slug;
  if (slug !== "all" && mirrorCollectionHtmlExists("all")) return "all";
  return null;
}

/** Yeni admin ürünleri için uygun bir PDP şablonu seç */
export function resolveMirrorProductTemplateSlug(slug: string): string | null {
  if (mirrorProductHtmlExists(slug)) return slug;
  if (mirrorProductHtmlExists(DEFAULT_PRODUCT_MIRROR_TEMPLATE_SLUG)) {
    return DEFAULT_PRODUCT_MIRROR_TEMPLATE_SLUG;
  }
  return null;
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

/** Ürün PDP iframe — prod: slug başına prebuilt */
export function productMirrorFileRel(slug: string, locale: ShopLocale): string {
  return locale === "tr"
    ? `theme/techizmet-shop/mirror/products/${slug}-tr.html`
    : `theme/techizmet-shop/mirror/products/${slug}.html`;
}

/** Locale'e göre mirror PDP dosyası diskte var mı */
export function productMirrorHtmlFileExists(slug: string, locale: ShopLocale): boolean {
  return existsSync(join(process.cwd(), "public", productMirrorFileRel(slug, locale)));
}

/**
 * Ürün PDP kaynak dosyası — slug dosyası yoksa şablon + locale yedeği (iframe ile aynı).
 * `templateSlug` yalnızca gerçek ürün slug'ından farklıysa döner.
 */
export function resolveProductMirrorSourceRel(
  slug: string,
  locale: ShopLocale,
): { rel: string; templateSlug: string | null } | null {
  const productSlug = slug.trim();
  if (!productSlug) return null;

  if (productMirrorHtmlFileExists(productSlug, locale)) {
    return { rel: productMirrorFileRel(productSlug, locale), templateSlug: null };
  }

  if (locale === "tr" && productMirrorHtmlFileExists(productSlug, "en")) {
    return { rel: productMirrorFileRel(productSlug, "en"), templateSlug: null };
  }

  const templateSlug = resolveMirrorProductTemplateSlug(productSlug);
  if (!templateSlug) return null;

  const aliased = templateSlug.toLowerCase() !== productSlug.toLowerCase() ? templateSlug : null;

  if (productMirrorHtmlFileExists(templateSlug, locale)) {
    return { rel: productMirrorFileRel(templateSlug, locale), templateSlug: aliased };
  }

  if (locale === "tr" && productMirrorHtmlFileExists(templateSlug, "en")) {
    return { rel: productMirrorFileRel(templateSlug, "en"), templateSlug: aliased };
  }

  return null;
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

