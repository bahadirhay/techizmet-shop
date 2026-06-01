import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

/** Yazı şablonu — ilk mevcut makale HTML'i */
export function resolveMirrorBlogArticleTemplateSlug(slug: string): string | null {
  if (mirrorBlogArticleHtmlExists(slug)) return slug;
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

/** Koleksiyon / kategori listesi iframe — prod: slug başına prebuilt */
export function buildCollectionMirrorSrc(
  slug: string,
  locale: ShopLocale,
  templateSlug: string,
): string {
  if (process.env.NODE_ENV === "production") {
    return toBrandedMirrorSrc(collectionMirrorFileRel(slug, locale));
  }
  const diskSlug = mirrorCollectionHtmlExists(slug) ? slug : templateSlug;
  return toBrandedMirrorSrc(collectionMirrorFileRel(diskSlug, locale));
}

export function buildProductMirrorSrc(slug: string, locale: ShopLocale, templateSlug: string): string {
  if (process.env.NODE_ENV === "production") {
    return toBrandedMirrorSrc(productMirrorFileRel(slug, locale));
  }
  const diskSlug = mirrorProductHtmlExists(slug) ? slug : templateSlug;
  return toBrandedMirrorSrc(productMirrorFileRel(diskSlug, locale));
}

export function buildBlogArticleMirrorSrc(slug: string, locale: ShopLocale): string | null {
  const templateSlug = resolveMirrorBlogArticleTemplateSlug(slug);
  if (!templateSlug) return null;

  if (process.env.NODE_ENV === "production") {
    return toBrandedMirrorSrc(blogArticleMirrorFileRel(slug, locale));
  }

  if (mirrorBlogArticleHtmlExists(slug)) {
    return toBrandedMirrorSrc(blogArticleMirrorFileRel(slug, locale));
  }

  return toBrandedMirrorSrc(blogArticleMirrorFileRel(templateSlug, locale), undefined, {
    blogSlug: slug,
  });
}
