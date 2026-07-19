/** Mirror HTML — yalnızca veritabanında yayında olan ürün kartlarını bırakır */

import { parseHTML } from "@/lib/linkedom-server";
import { prisma } from "@/lib/prisma";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

const PRODUCT_HREF = /\/products\/([^/?#]+)/i;

export function productSlugFromMirrorHref(href: string): string | null {
  const m = href.match(PRODUCT_HREF);
  if (!m) return null;
  return m[1].replace(/\.html$/i, "").toLowerCase();
}

function slugFromProductCard(el: Element): string | null {
  for (const link of el.querySelectorAll("a[href]")) {
    const slug = productSlugFromMirrorHref(link.getAttribute("href") ?? "");
    if (slug) return slug;
    const href = (link.getAttribute("href") ?? "").trim();
    const bare = href.match(/^(?:\.\/)?([a-z0-9-]+)\.html$/i);
    if (bare) return bare[1]!.toLowerCase();
  }
  return null;
}

/** Yayında olmayan veya DB'de olmayan ürün kartlarını kaldırır */
export function pruneMirrorDocToPublishedCatalog(
  doc: Document,
  publishedSlugs: ReadonlySet<string>,
): void {
  if (!publishedSlugs.size) return;

  const removeUnknown = (selector: string) => {
    doc.querySelectorAll(selector).forEach((el) => {
      const slug = slugFromProductCard(el);
      if (slug && !publishedSlugs.has(slug)) el.remove();
    });
  };

  removeUnknown(".horizontal--product-card");
  removeUnknown(".product--card");
  removeUnknown(".product-grid-card");
  removeUnknown("#MainContent .section-related-products .product--card");
  removeUnknown(".discover-list [data-product-card]");

  /* Trend ürünler vitrin editöründen yönetilir; şablon skincare slug'ları budanırsa bölüm boş kalır */

  doc.documentElement.setAttribute("data-kn-catalog-pruned", "1");
}

export function pruneMirrorHtmlToPublishedCatalog(
  html: string,
  publishedSlugs: ReadonlySet<string>,
): string {
  if (!publishedSlugs.size) return html;
  const { document } = parseHTML(html);
  pruneMirrorDocToPublishedCatalog(document, publishedSlugs);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}

export async function loadPublishedProductSlugSet(siteId: string): Promise<Set<string>> {
  const rows = await prisma.storeProduct.findMany({
    where: { siteId, ...storefrontListedWhere },
    select: { slug: true },
  });
  return new Set(rows.map((r) => r.slug.toLowerCase()));
}

const BLOG_HREF = /\/blogs\/news\/([^/?#]+)/i;

function slugFromBlogItem(el: Element): string | null {
  for (const link of el.querySelectorAll("a[href]")) {
    const m = (link.getAttribute("href") ?? "").match(BLOG_HREF);
    if (m) return m[1].replace(/\.html$/i, "").toLowerCase();
  }
  return null;
}

/** Bir blog kartında "devamını oku" butonunu kartın gerçek yazı linkine hizalar */
function syncBlogReadMoreHref(el: Element): void {
  const primary =
    el.querySelector("a.blog--title[href]")?.getAttribute("href") ??
    el.querySelector("a.blog--image[href]")?.getAttribute("href");
  if (!primary) return;
  el.querySelectorAll("a.small-button[href], .blog--button a[href]").forEach((btn) => {
    btn.setAttribute("href", primary);
  });
}

/** Başka mağazanın blog kartlarını kaldırır + kalan kartların "devamını oku" linkini düzeltir */
export function pruneMirrorDocToPublishedBlogs(
  doc: Document,
  publishedSlugs: ReadonlySet<string>,
): void {
  doc.querySelectorAll(".blog--item").forEach((el) => {
    const slug = slugFromBlogItem(el);
    if (slug && !publishedSlugs.has(slug)) {
      el.remove();
      return;
    }
    syncBlogReadMoreHref(el);
  });
  doc.documentElement.setAttribute("data-kn-blog-pruned", "1");
}

export function pruneMirrorHtmlToPublishedBlogs(
  html: string,
  publishedSlugs: ReadonlySet<string>,
): string {
  if (!publishedSlugs.size) {
    const { document } = parseHTML(html);
    document.querySelectorAll(".blog--item").forEach((el) => el.remove());
    const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
    return `${doctype}\n${document.documentElement.outerHTML}`;
  }
  const { document } = parseHTML(html);
  pruneMirrorDocToPublishedBlogs(document, publishedSlugs);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}

export async function loadPublishedBlogSlugSet(siteId: string): Promise<Set<string>> {
  const rows = await prisma.storeBlogPost.findMany({
    where: { siteId, published: true },
    select: { slug: true },
  });
  return new Set(rows.map((r) => r.slug.toLowerCase()));
}

const COLLECTION_HREF = /\/collections\/([^/?#]+)/i;

function collectionSlugFromHref(href: string): string | null {
  const m = href.match(COLLECTION_HREF);
  if (!m) return null;
  return m[1].replace(/\.html$/i, "").toLowerCase();
}

/**
 * Şablondan gelen (kozmetik) koleksiyon promo kartlarını kaldırır:
 * DB'de olmayan bir /collections/{slug}'a bağlı `.card--item` kartları budanır.
 * "all" ve gerçek koleksiyon/kategori slug'ları korunur.
 */
export function pruneMirrorDocToPublishedCollections(
  doc: Document,
  knownSlugs: ReadonlySet<string>,
): void {
  doc.querySelectorAll("a.card--item[href]").forEach((el) => {
    const slug = collectionSlugFromHref(el.getAttribute("href") ?? "");
    if (!slug) return;
    if (slug === "all") return;
    if (knownSlugs.has(slug)) return;
    // Kart genelde ayrıca dış sarmalayıcı içinde; yalnızca <a> kartı kaldır
    el.remove();
  });
  doc.documentElement.setAttribute("data-kn-collection-cards-pruned", "1");
}

export function pruneMirrorHtmlToPublishedCollections(
  html: string,
  knownSlugs: ReadonlySet<string>,
): string {
  const { document } = parseHTML(html);
  pruneMirrorDocToPublishedCollections(document, knownSlugs);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}

export async function loadKnownCollectionSlugSet(siteId: string): Promise<Set<string>> {
  const [collections, categories] = await Promise.all([
    prisma.storeCollection.findMany({ where: { siteId }, select: { slug: true } }),
    prisma.storeCategory.findMany({ where: { siteId }, select: { slug: true } }),
  ]);
  const set = new Set<string>();
  for (const c of collections) set.add(c.slug.toLowerCase());
  for (const c of categories) set.add(c.slug.toLowerCase());
  return set;
}
