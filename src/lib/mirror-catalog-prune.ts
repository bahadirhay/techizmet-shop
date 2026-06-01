/** Mirror HTML — yalnızca veritabanında yayında olan ürün kartlarını bırakır */

import { parseHTML } from "linkedom";
import { prisma } from "@/lib/prisma";

const PRODUCT_HREF = /\/products\/([^/?#]+)/i;

export function productSlugFromMirrorHref(href: string): string | null {
  const m = href.match(PRODUCT_HREF);
  if (!m) return null;
  return m[1].replace(/\.html$/i, "").toLowerCase();
}

function slugFromProductCard(el: Element): string | null {
  const link = el.querySelector('a[href*="/products/"]');
  if (!link) return null;
  return productSlugFromMirrorHref(link.getAttribute("href") ?? "");
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

  doc.querySelectorAll("trending-set").forEach((el) => {
    const slug = slugFromProductCard(el);
    if (slug && !publishedSlugs.has(slug)) el.remove();
  });

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
    where: { siteId, published: true },
    select: { slug: true },
  });
  return new Set(rows.map((r) => r.slug.toLowerCase()));
}
