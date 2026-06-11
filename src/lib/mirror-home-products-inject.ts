/** Ana sayfa vitrin bölümleri — tema demo ürünleri yerine DB ürünleri */

import { parseHTML } from "linkedom";
import type { ShopLocale } from "@/lib/i18n/locale";
import { formatTry } from "@/lib/format";
import {
  buildMirrorProductCardHtml,
  type VitrinCollectionProductCard,
} from "@/lib/mirror-collections-sync";
import { prisma } from "@/lib/prisma";
import { getSiteSettingsUncached } from "@/lib/site-settings-load";
import { resolveMirrorCollectionTexts } from "@/lib/store-static-texts";

export async function loadHomeListingProducts(siteId: string): Promise<VitrinCollectionProductCard[]> {
  const rows = await prisma.storeProduct.findMany({
    where: { siteId, published: true },
    orderBy: [{ title: "asc" }],
    select: {
      slug: true,
      title: true,
      imageUrl: true,
      priceMinor: true,
      compareAtMinor: true,
      stockQty: true,
      lowStockThreshold: true,
      badgesJson: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });
  return rows.map((p) => ({
    slug: p.slug,
    title: p.title,
    imageUrl: p.imageUrl || p.images[0]?.url || null,
    priceMinor: p.priceMinor,
    compareAtMinor: p.compareAtMinor,
    stockQty: p.stockQty,
    lowStockThreshold: p.lowStockThreshold,
    badgesJson: p.badgesJson,
  }));
}

function patchHorizontalProductCard(card: Element, product: VitrinCollectionProductCard, locale?: ShopLocale) {
  const href = `/products/${encodeURIComponent(product.slug)}`;
  const isTr = locale?.toLowerCase().startsWith("tr") ?? true;
  card.querySelectorAll('a[href*="/products/"]').forEach((a) => a.setAttribute("href", href));
  const titleEl = card.querySelector(".product--title");
  if (titleEl) titleEl.textContent = product.title;
  const priceEl = card.querySelector(".product--actual-price");
  if (priceEl) priceEl.textContent = formatTry(product.priceMinor);
  const image = product.imageUrl?.trim();
  if (image) {
    card.querySelectorAll("img").forEach((img) => {
      const el = img as HTMLImageElement;
      el.src = image;
      el.setAttribute("data-src", image);
      el.setAttribute("data-original", image);
      el.alt = product.title;
      el.removeAttribute("srcset");
    });
  }
  const viewDetail = card.querySelector(".product--view-detail a");
  if (viewDetail) viewDetail.textContent = isTr ? "Detayları gör" : "View details";
}

/** Tema demo slug'ları yerine yayınlanan ürünleri ana sayfa listelerine yazar */
export function applyHomeListingProductsToDocument(
  doc: Document,
  products: VitrinCollectionProductCard[],
  locale?: ShopLocale,
  texts?: ReturnType<typeof resolveMirrorCollectionTexts>,
) {
  if (!products.length || !texts) return;

  doc.querySelectorAll("#MainContent .swiper-wrapper").forEach((wrapper) => {
    if (!wrapper.querySelector(".product--card")) return;
    const slotCount = Math.max(wrapper.querySelectorAll(".product--card").length, 4);
    const count = Math.min(Math.max(slotCount, products.length), 12);
    const items = Array.from({ length: count }, (_, i) => products[i % products.length]);
    wrapper.innerHTML = items
      .map((p) => buildMirrorProductCardHtml(p, texts, { swiperSlide: true, locale }))
      .join("\n");
  });

  doc.querySelectorAll("#MainContent .section-scrolling-collections .horizontal--product-card").forEach((card, i) => {
    patchHorizontalProductCard(card, products[i % products.length], locale);
  });

  doc.documentElement.setAttribute("data-kn-home-products-injected", "1");
}

export async function injectHomeListingProductsIntoHtml(
  html: string,
  siteId: string,
  locale: ShopLocale,
): Promise<string> {
  const products = await loadHomeListingProducts(siteId);
  if (!products.length) return html;

  const settings = await getSiteSettingsUncached(siteId);
  const texts = resolveMirrorCollectionTexts(locale, settings.store?.texts);
  const { document } = parseHTML(html);
  applyHomeListingProductsToDocument(document, products, locale, texts);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}
