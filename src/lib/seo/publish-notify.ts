import "server-only";

import {
  notifySearchEnginesForBlogSlug,
  notifySearchEnginesForPath,
  notifySearchEnginesForPaths,
} from "@/lib/seo/notify-search-engines";

export function productPublicPath(slug: string): string {
  return `/products/${slug}`;
}

export function collectionPublicPath(slug: string): string {
  return slug === "all" ? "/collections/all" : `/collections/${slug}`;
}

export function categoryPublicPath(slug: string): string {
  return `/collections/all?category=${encodeURIComponent(slug)}`;
}

export function cmsPagePublicPath(slug: string): string {
  return slug === "home" ? "/" : `/pages/${slug}`;
}

const PRODUCT_REINDEX_BODY_KEYS = new Set([
  "title",
  "slug",
  "seoTitle",
  "seoDescription",
  "description",
  "descriptionHtml",
  "keyFeaturesHtml",
  "howToUseHtml",
  "published",
  "imageUrl",
  "brandId",
  "collectionId",
  "categoryId",
  "categoryIds",
  "price",
  "compareAt",
  "variants",
  "variantOptionName",
]);

/** Yayınlı ürün güncellemesinde IndexNow tetiklenmeli mi (stok-only güncellemeler hariç) */
export function shouldReindexPublishedProduct(
  existing: { published: boolean; slug: string },
  next: { published: boolean; slug: string },
  body: Record<string, unknown>,
): boolean {
  if (!next.published) return false;
  if (!existing.published) return true;
  if (existing.slug !== next.slug) return true;
  for (const key of PRODUCT_REINDEX_BODY_KEYS) {
    if (body[key] !== undefined) return true;
  }
  return false;
}

const COLLECTION_REINDEX_BODY_KEYS = new Set([
  "title",
  "slug",
  "description",
  "imageUrl",
  "published",
]);

export function shouldReindexPublishedCollection(
  existing: { published: boolean; slug: string },
  next: { published: boolean; slug: string },
  body: Record<string, unknown>,
): boolean {
  if (!next.published) return false;
  if (!existing.published) return true;
  if (existing.slug !== next.slug) return true;
  for (const key of COLLECTION_REINDEX_BODY_KEYS) {
    if (body[key] !== undefined) return true;
  }
  return false;
}

const CATEGORY_REINDEX_BODY_KEYS = new Set([
  "title",
  "slug",
  "description",
  "seoTitle",
  "seoDescription",
  "active",
  "imageUrl",
]);

export function shouldReindexActiveCategory(
  existing: { active: boolean; slug: string },
  next: { active: boolean; slug: string },
  body: Record<string, unknown>,
): boolean {
  if (!next.active) return false;
  if (!existing.active) return true;
  if (existing.slug !== next.slug) return true;
  for (const key of CATEGORY_REINDEX_BODY_KEYS) {
    if (body[key] !== undefined) return true;
  }
  return false;
}

export function notifyPublishedProduct(slug: string): void {
  notifySearchEnginesForPath(productPublicPath(slug));
}

export function notifyPublishedProducts(slugs: string[]): void {
  notifySearchEnginesForPaths(slugs.map(productPublicPath));
}

export function notifyPublishedCollection(slug: string): void {
  notifySearchEnginesForPath(collectionPublicPath(slug));
}

export function notifyActiveCategory(slug: string): void {
  notifySearchEnginesForPath(categoryPublicPath(slug));
}

export function notifyPublishedCmsPage(slug: string): void {
  notifySearchEnginesForPath(cmsPagePublicPath(slug));
}

export { notifySearchEnginesForBlogSlug };
