/** Ana sayfa vitrin bölümleri — DOM enjeksiyonu (istemci + sunucu güvenli) */

import type { ShopLocale } from "@/lib/i18n/locale";
import { applyProductPricingToRoot } from "@/lib/mirror-listing-prices";
import {
  buildMirrorProductCardHtml,
  type VitrinCollectionProductCard,
} from "@/lib/mirror-collections-sync";
import type { resolveMirrorCollectionTexts } from "@/lib/store-static-texts";

function patchHorizontalProductCard(card: Element, product: VitrinCollectionProductCard, locale?: ShopLocale) {
  const href = `/products/${encodeURIComponent(product.slug)}`;
  const isTr = locale?.toLowerCase().startsWith("tr") ?? true;
  card.querySelectorAll('a[href*="/products/"]').forEach((a) => a.setAttribute("href", href));
  const titleEl = card.querySelector(".product--title");
  if (titleEl) titleEl.textContent = product.title;
  applyProductPricingToRoot(card, {
    priceMinor: product.priceMinor,
    compareAtMinor: product.compareAtMinor,
  });
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
