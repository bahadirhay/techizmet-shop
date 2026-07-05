/** Ana sayfa vitrin bölümleri — DOM enjeksiyonu (istemci + sunucu güvenli) */

import type { ShopLocale } from "@/lib/i18n/locale";
import { localizeMirrorTextForLocale } from "@/lib/mirror-en-locale";
import { applyProductPricingToRoot } from "@/lib/mirror-listing-prices";
import {
  buildMirrorProductCardHtml,
  type VitrinCollectionProductCard,
} from "@/lib/mirror-collections-sync";
import { buildProductCardGalleryMarkup, initProductCardGalleries, stripProductCardGalleryBoundFlags } from "@/lib/mirror-product-card-gallery";
import { MIRROR_CARD_IMAGE_WIDTH, mirrorCdnImageUrl } from "@/lib/mirror-cdn-image";
import type { resolveMirrorCollectionTexts } from "@/lib/store-static-texts";

function isDomElement(node: unknown): node is Element {
  return !!node && typeof node === "object" && "nodeType" in node && (node as Element).nodeType === 1;
}

function isHtmlElement(node: unknown): node is HTMLElement {
  return isDomElement(node) && "style" in node;
}

function readCardSlug(card: Element): string | null {
  return (
    card.getAttribute("data-id")?.trim() ||
    card.querySelector<HTMLElement>("[data-handle]")?.getAttribute("data-handle")?.trim() ||
    null
  );
}

function readExistingGalleryUrls(card: Element): string[] | undefined {
  const media = card.querySelector("[data-product-media], .media");
  if (!isHtmlElement(media)) return undefined;
  const raw = media.getAttribute("data-kn-gallery");
  if (!raw?.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    const urls = parsed.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
    return urls.length > 1 ? urls : undefined;
  } catch {
    return undefined;
  }
}

function enrichProductsWithExistingGalleries(
  doc: Document,
  products: VitrinCollectionProductCard[],
): VitrinCollectionProductCard[] {
  const galleryBySlug = new Map<string, string[]>();
  doc.querySelectorAll("#MainContent .product--card").forEach((card) => {
    const slug = readCardSlug(card);
    const urls = readExistingGalleryUrls(card);
    if (slug && urls?.length) galleryBySlug.set(slug, urls);
  });
  if (!galleryBySlug.size) return products;

  return products.map((product) => {
    if (product.imageUrls && product.imageUrls.length > 1) return product;
    const existing = galleryBySlug.get(product.slug);
    if (!existing || existing.length <= 1) return product;
    return { ...product, imageUrls: existing };
  });
}

export function homeListingCatalogFingerprint(products: VitrinCollectionProductCard[]): string {
  return products
    .map((product) => {
      const urls = (product.imageUrls ?? []).join("\u001f");
      return `${product.slug}\u001e${product.priceMinor}\u001e${product.compareAtMinor ?? ""}\u001e${product.title}\u001e${product.imageUrl ?? ""}\u001e${urls}`;
    })
    .join("\u001d");
}

function patchProductCardMedia(card: Element, product: VitrinCollectionProductCard, locale?: ShopLocale) {
  const href = `/products/${encodeURIComponent(product.slug)}`;
  const isTr = locale?.toLowerCase().startsWith("tr") ?? true;

  card.setAttribute("data-id", product.slug);
  card.querySelectorAll('a[href*="/products/"]').forEach((a) => a.setAttribute("href", href));
  card.querySelectorAll<HTMLElement>("[data-handle]").forEach((el) => {
    el.setAttribute("data-handle", product.slug);
  });

  const titleEl = card.querySelector(".product--title");
  if (titleEl) {
    const title = localizeMirrorTextForLocale(product.title, locale ?? "tr");
    titleEl.textContent = title;
  }

  applyProductPricingToRoot(card, {
    priceMinor: product.priceMinor,
    compareAtMinor: product.compareAtMinor,
  });

  const image = product.imageUrl?.trim();
  const galleryUrls =
    product.imageUrls?.filter((u) => u.trim()).slice(0, 8) ?? (image ? [image] : []);

  if (galleryUrls.length) {
    const primaryOriginal = galleryUrls[0]!;
    const primary = mirrorCdnImageUrl(primaryOriginal, MIRROR_CARD_IMAGE_WIDTH);
    card.querySelectorAll("img").forEach((img) => {
      const el = img as HTMLImageElement;
      el.src = primary;
      el.setAttribute("data-src", primary);
      el.setAttribute("data-original", primaryOriginal);
      el.alt = localizeMirrorTextForLocale(product.title, locale ?? "tr");
      el.removeAttribute("srcset");
      el.setAttribute("loading", "lazy");
    });

    const media = card.querySelector("[data-product-media], .media");
    if (isHtmlElement(media)) {
      if (galleryUrls.length > 1) {
        const { galleryAttr, indicatorHtml } = buildProductCardGalleryMarkup(galleryUrls);
        media.querySelector(".kn-card-gallery-indicator")?.remove();
        media.removeAttribute("data-kn-gallery-bound");
        if (galleryAttr) {
          const json = galleryAttr.replace(/^ data-kn-gallery='/, "").replace(/'$/, "");
          media.setAttribute("data-kn-gallery", json);
          media.insertAdjacentHTML("beforeend", indicatorHtml);
        }
      } else {
        media.removeAttribute("data-kn-gallery");
        media.removeAttribute("data-kn-gallery-bound");
        media.querySelector(".kn-card-gallery-indicator")?.remove();
      }
    }
  }

  const viewDetail = card.querySelector(".product--view-detail a");
  if (viewDetail) viewDetail.textContent = isTr ? "Detayları gör" : "View details";
}

function patchHomeListingSwipersInPlace(
  doc: Document,
  products: VitrinCollectionProductCard[],
  locale?: ShopLocale,
) {
  doc.querySelectorAll("#MainContent .swiper-wrapper").forEach((wrapper) => {
    const cards = wrapper.querySelectorAll(".product--card");
    if (!cards.length) return;
    cards.forEach((card, index) => {
      patchProductCardMedia(card, products[index % products.length]!, locale);
    });
  });
}

function rebuildHomeListingSwipers(
  doc: Document,
  products: VitrinCollectionProductCard[],
  locale: ShopLocale | undefined,
  texts: ReturnType<typeof resolveMirrorCollectionTexts>,
) {
  doc.querySelectorAll("#MainContent .swiper-wrapper").forEach((wrapper) => {
    if (!wrapper.querySelector(".product--card")) return;
    const slotCount = Math.max(wrapper.querySelectorAll(".product--card").length, 4);
    const count = Math.min(Math.max(slotCount, products.length), 12);
    const items = Array.from({ length: count }, (_, i) => products[i % products.length]!);
    wrapper.innerHTML = items
      .map((product) => buildMirrorProductCardHtml(product, texts, { swiperSlide: true, locale }))
      .join("\n");
  });
}

function homeListingNeedsFullRebuild(doc: Document, products: VitrinCollectionProductCard[]): boolean {
  const publishedSlugs = new Set(products.map((product) => product.slug));
  const wrappers = [...doc.querySelectorAll("#MainContent .swiper-wrapper")].filter((wrapper) =>
    wrapper.querySelector(".product--card"),
  );
  if (!wrappers.length) return true;

  return wrappers.some((wrapper) =>
    [...wrapper.querySelectorAll(".product--card")].some((card) => {
      const slug = readCardSlug(card);
      return !slug || !publishedSlugs.has(slug);
    }),
  );
}

/** Tema demo slug'ları yerine yayınlanan ürünleri ana sayfa listelerine yazar */
export function applyHomeListingProductsToDocument(
  doc: Document,
  products: VitrinCollectionProductCard[],
  locale?: ShopLocale,
  texts?: ReturnType<typeof resolveMirrorCollectionTexts>,
) {
  if (!products.length || !texts) return;

  const enriched = enrichProductsWithExistingGalleries(doc, products);
  const fingerprint = homeListingCatalogFingerprint(enriched);
  const previousFingerprint = doc.documentElement.getAttribute("data-kn-home-catalog-fp");
  const alreadyInjected = doc.documentElement.getAttribute("data-kn-home-products-injected") === "1";

  if (alreadyInjected && previousFingerprint === fingerprint) {
    initProductCardGalleries(doc);
    return;
  }

  if (alreadyInjected && !homeListingNeedsFullRebuild(doc, enriched)) {
    patchHomeListingSwipersInPlace(doc, enriched, locale);
  } else {
    rebuildHomeListingSwipers(doc, enriched, locale, texts);
  }

  doc.querySelectorAll("#MainContent .section-scrolling-collections .horizontal--product-card").forEach((card, i) => {
    patchProductCardMedia(card, enriched[i % enriched.length]!, locale);
  });

  doc.documentElement.setAttribute("data-kn-home-products-injected", "1");
  doc.documentElement.setAttribute("data-kn-home-catalog-fp", fingerprint);
  stripProductCardGalleryBoundFlags(doc);
  initProductCardGalleries(doc);
}
