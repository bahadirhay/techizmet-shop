import {
  buildMirrorProductCardHtml,
  type VitrinCollectionProductCard,
} from "@/lib/mirror-collections-sync";
import { initProductCardGalleries } from "@/lib/mirror-product-card-gallery";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { RelatedProductsSettings } from "@/lib/product-related";
import type { ResolvedMirrorCollectionTexts } from "@/lib/store-static-texts";

function escText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function relatedHeading(locale: ShopLocale): string {
  return locale === "en" ? "You may also like" : "Önerilen Ürünler";
}

/** Mirror PDP — önerilen ürünler bölümünü doldur / gizle */
export function applyRelatedProductsOverlay(
  doc: Document,
  products: VitrinCollectionProductCard[],
  settings: RelatedProductsSettings,
  locale: ShopLocale,
  texts: ResolvedMirrorCollectionTexts,
): void {
  const section = doc.querySelector(
    "#MainContent .section-related-products, #MainContent .kn-mirror-section.section-related-products",
  ) as HTMLElement | null;
  if (!section) return;

  const host =
    (section.querySelector("product-recommendations") as HTMLElement | null) ??
    (section.querySelector(".section-wrapper") as HTMLElement | null);

  if (settings.mode === "off" || !products.length) {
    if (host) host.innerHTML = "";
    section.style.display = "none";
    section.setAttribute("data-kn-related", "off");
    return;
  }

  const cols = settings.columns || 4;
  const cards = products
    .map((p) => buildMirrorProductCardHtml(p, texts, { locale }))
    .join("\n");

  const html = `<div class="kn-related-products" data-kn-related="1">
  <div class="kn-related-products__header section--header">
    <h2 class="kn-related-products__title h3">${escText(relatedHeading(locale))}</h2>
  </div>
  <div class="kn-related-products-grid" style="--kn-related-cols:${cols}">
    ${cards}
  </div>
</div>`;

  if (host) {
    host.removeAttribute("data-url");
    host.removeAttribute("data-kn-recs-disabled");
    host.innerHTML = html;
  } else {
    const wrap = section.querySelector(".section-wrapper") ?? section;
    wrap.insertAdjacentHTML("beforeend", html);
  }

  section.style.display = "";
  section.style.removeProperty("display");
  section.setAttribute("data-kn-related", "on");
  initProductCardGalleries(doc);
}
