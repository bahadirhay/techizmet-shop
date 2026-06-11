/** Vitrin liste kartları — ürün linkindeki slug ile DB fiyatını eşleştirir (overlay sonrası). */

import { parseHTML } from "linkedom";
import { formatTry } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function slugFromProductHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const m = href.match(/\/products\/([^/?#]+)/i);
  return m?.[1]?.replace(/\.html$/i, "") ?? null;
}

export async function syncMirrorListingPricesInHtml(html: string, siteId: string): Promise<string> {
  const rows = await prisma.storeProduct.findMany({
    where: { siteId, published: true },
    select: { slug: true, priceMinor: true, compareAtMinor: true },
  });
  if (!rows.length) return html;

  const bySlug = new Map(rows.map((p) => [p.slug, p]));
  const { document } = parseHTML(html);

  function patchCard(root: Element) {
    const link =
      (root.matches('a[href*="/products/"]') ? root : null) ??
      root.querySelector('a[href*="/products/"]');
    if (!link) return;
    const slug = slugFromProductHref(link.getAttribute("href"));
    if (!slug) return;
    const product = bySlug.get(slug);
    if (!product) return;

    const priceEl = root.querySelector(".product--actual-price");
    if (priceEl) priceEl.textContent = formatTry(product.priceMinor);

    const cutEl = root.querySelector(".product--cut-price");
    if (cutEl) {
      if (product.compareAtMinor && product.compareAtMinor > product.priceMinor) {
        cutEl.textContent = formatTry(product.compareAtMinor);
        (cutEl as HTMLElement).style.removeProperty("display");
      } else {
        (cutEl as HTMLElement).style.display = "none";
      }
    }

    const tabInfo = root.querySelector(".collections-tab--info") ?? root.closest(".collections-tab--menu-content-item-box")?.querySelector(".collections-tab--info");
    if (tabInfo) (tabInfo as HTMLElement).style.removeProperty("display");
  }

  for (const sel of [
    ".collections-tab--menu-content-item-inner",
    ".collections-tab--menu-content-item-box",
    ".horizontal--product-card",
    ".product--card",
  ]) {
    document.querySelectorAll(sel).forEach(patchCard);
  }

  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}
