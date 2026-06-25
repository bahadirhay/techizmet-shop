import { formatTry } from "@/lib/format";
import {
  type ActiveCollectionFilters,
  type CollectionFilterFacets,
  formatQuantityFilterLabel,
} from "@/lib/collection-filter-facets";
import type { CollectionFilterConfig } from "@/lib/collection-filter-settings";
import type { CollectionFilterKey } from "@/lib/collection-filter-facets";
import {
  PRODUCT_IMAGE_HEIGHT,
  PRODUCT_IMAGE_WIDTH,
  productImageMediaRatioStyle,
} from "@/lib/product-image-spec";
import { formatPercentOffBadge, percentOffFromPrices } from "@/lib/product-discount";
import { badgePreset, parseProductBadges } from "@/lib/product-badges";
import type { ResolvedMirrorCollectionTexts } from "@/lib/store-static-texts";
import { buildProductCardGalleryMarkup, initProductCardGalleries } from "@/lib/mirror-product-card-gallery";
import { MIRROR_CARD_IMAGE_WIDTH, mirrorCdnImageUrl } from "@/lib/mirror-cdn-image";

/** Admin → Koleksiyonlar verisini mirror /collections kartlarına yazar */

export type VitrinCollectionCard = {
  slug: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
};

export type VitrinCollectionDetail = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
};

export type VitrinCollectionProductCard = {
  slug: string;
  title: string;
  imageUrl?: string | null;
  /** Liste kartı hover scrub — yalnızca görseller, sıralı */
  imageUrls?: string[];
  priceMinor: number;
  compareAtMinor?: number | null;
  stockQty: number;
  lowStockThreshold: number;
  badgesJson?: string | null;
  kind?: string | null;
};

export type VitrinCollectionCategoryOption = {
  slug: string;
  title: string;
};

const EMPTY_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

/** Shopify mirror şablonundaki sayfa başına ürün (eski tema) */
export const MIRROR_COLLECTION_PAGE_SIZE = 24;

const COLLECTION_PRODUCTS_GUARD_ID = "kn-collection-products-guard";

/** Şablon ürünleri — admin verisi gelene kadar gizle (kategori flash) */
export function setCollectionProductsAwaiting(doc: Document, awaiting: boolean) {
  let style = doc.getElementById(COLLECTION_PRODUCTS_GUARD_ID) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement("style");
    style.id = COLLECTION_PRODUCTS_GUARD_ID;
    style.textContent = `
html.kn-collection-awaiting-products #MainContent .main-collection--products-list,
html.kn-collection-awaiting-products #MainContent [data-total-products-count],
html.kn-collection-awaiting-products #MainContent .collection-products--count,
html.kn-collection-awaiting-products #MainContent .collection-products--text,
html.kn-collection-awaiting-products #MainContent ul.pagination {
  visibility: hidden !important;
}
html.kn-collection-awaiting-products #MainContent .main-collection--products-list {
  min-height: 12rem;
}
`;
    doc.head.appendChild(style);
  }
  doc.documentElement.classList.toggle("kn-collection-awaiting-products", awaiting);
}

function defaultMirrorCollectionTexts(locale?: string): ResolvedMirrorCollectionTexts {
  const isTr = locale?.toLowerCase().startsWith("tr");
  return {
    categoriesLabel: isTr ? "Kategoriler" : "Categories",
    productCountSingular: isTr ? "Ürün" : "Product",
    productCountPlural: isTr ? "Ürünler" : "Products",
    soldOutBadge: isTr ? "Tükendi" : "Sold out",
    lowStockPrefix: isTr ? "Son" : "Only",
  };
}

function collectionHref(slug: string) {
  return `/collections/${encodeURIComponent(slug)}`;
}

function productHref(slug: string) {
  return `/products/${encodeURIComponent(slug)}`;
}

function categoryHref(slug: string) {
  return `/collections/all?category=${encodeURIComponent(slug)}`;
}

function escAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escText(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function setCardImage(card: Element, url: string) {
  card.querySelectorAll("img.collection--card-image, img").forEach((img) => {
    const el = img as HTMLImageElement;
    el.src = url;
    el.setAttribute("data-src", url);
    el.setAttribute("data-original", url);
    el.removeAttribute("srcset");
  });
}

function clearCardImage(card: Element) {
  card.querySelectorAll("img.collection--card-image, img").forEach((img) => {
    const el = img as HTMLImageElement;
    el.src = EMPTY_IMAGE;
    el.setAttribute("data-src", EMPTY_IMAGE);
    el.setAttribute("data-original", EMPTY_IMAGE);
    el.removeAttribute("srcset");
  });
}

function cardSlug(item: Element): string | null {
  const href = item.querySelector("a.collection--card")?.getAttribute("href") ?? "";
  return href.match(/\/collections\/([^/?#.]+)/)?.[1] ?? null;
}

function applyCollectionCard(item: Element, col: VitrinCollectionCard) {
  const anchor = item.querySelector("a.collection--card");
  if (!anchor) return false;

  const href = collectionHref(col.slug);
  anchor.setAttribute("href", href);

  const heading = anchor.querySelector(".collection--heading");
  if (heading) {
    heading.textContent = col.title;
    heading.setAttribute("data-text", col.title);
  }

  anchor.querySelectorAll("img.collection--card-image, img").forEach((img) => {
    img.setAttribute("alt", col.title);
  });

  if (col.imageUrl?.trim()) setCardImage(anchor, col.imageUrl.trim());
  else clearCardImage(anchor);

  return true;
}

function cloneCollectionCard(template: Element, col: VitrinCollectionCard) {
  const clone = template.cloneNode(true) as HTMLElement;
  clone.id = `container-${col.slug}`;
  applyCollectionCard(clone, col);
  return clone;
}

export function applyCollectionsCardsFromAdmin(doc: Document, collections: VitrinCollectionCard[]) {
  const wrapper = doc.querySelector(
    "#MainContent .collection-list--wrapper, #MainContent .main-collection-list--outer .collection-list--wrapper",
  );
  if (!wrapper) return;

  const sorted = [...collections].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  const bySlug = new Map(sorted.map((c) => [c.slug, c] as const));

  const items = [...wrapper.querySelectorAll(".collection--card-item")];
  const template = items[0] ?? null;
  const existingBySlug = new Map<string, Element>();

  for (const item of items) {
    const slug = cardSlug(item);
    if (!slug) continue;
    const col = bySlug.get(slug);
    if (!col) {
      item.remove();
      continue;
    }
    applyCollectionCard(item, col);
    existingBySlug.set(slug, item);
  }

  for (const col of sorted) {
    const item = existingBySlug.get(col.slug) ?? (template ? cloneCollectionCard(template, col) : null);
    if (!item) continue;
    wrapper.appendChild(item);
  }
}

function productBadgeHtml(
  product: VitrinCollectionProductCard,
  texts: ResolvedMirrorCollectionTexts,
) {
  const badges: string[] = [];
  if (product.kind === "bundle") {
    const preset = badgePreset("bundle");
    if (preset) {
      badges.push(
        `<span class="badge" style="color:${preset.color};background:${preset.bg}">${escText(preset.label)}</span>`,
      );
    }
  }
  for (const id of parseProductBadges(product.badgesJson)) {
    if (id === "bundle" && product.kind === "bundle") continue;
    const preset = badgePreset(id);
    if (preset) {
      badges.push(
        `<span class="badge" style="color:${preset.color};background:${preset.bg}">${escText(preset.label)}</span>`,
      );
    }
  }
  const percent = percentOffFromPrices(product.compareAtMinor, product.priceMinor);
  if (percent) badges.push(`<span class="badge">${escText(formatPercentOffBadge(percent))}</span>`);
  if (product.stockQty <= 0) badges.push(`<span class="badge">${escText(texts.soldOutBadge)}</span>`);
  else if (product.stockQty <= product.lowStockThreshold) {
    badges.push(`<span class="badge">${escText(`${texts.lowStockPrefix} ${product.stockQty}`)}</span>`);
  }
  return badges.join("");
}

function productCardHtml(
  product: VitrinCollectionProductCard,
  texts: ResolvedMirrorCollectionTexts,
  options?: { swiperSlide?: boolean; locale?: string },
) {
  const href = productHref(product.slug);
  const title = escText(product.title);
  const addLabel = options?.locale?.toLowerCase().startsWith("en") ? "Add to cart" : "Sepete ekle";
  const galleryUrls =
    product.imageUrls?.filter((u) => u.trim()).slice(0, 8) ??
    (product.imageUrl?.trim() ? [product.imageUrl.trim()] : []);
  const imageOriginal = galleryUrls[0]?.trim() || product.imageUrl?.trim() || EMPTY_IMAGE;
  const image =
    imageOriginal === EMPTY_IMAGE
      ? EMPTY_IMAGE
      : mirrorCdnImageUrl(imageOriginal, MIRROR_CARD_IMAGE_WIDTH);
  const { galleryAttr, indicatorHtml } = buildProductCardGalleryMarkup(galleryUrls);
  const price = escText(formatTry(product.priceMinor));
  const compare = product.compareAtMinor && product.compareAtMinor > product.priceMinor
    ? `<span class="product--cut-price line-through">${escText(formatTry(product.compareAtMinor))}</span>`
    : "";
  const badges = productBadgeHtml(product, texts);
  const slideClass = options?.swiperSlide ? " swiper-slide" : "";
  const slideAttr = options?.swiperSlide ? " data-card-animate" : "";

  return `<div class="product--card${slideClass}"${slideAttr} is="card-animate">
  <div class="product--card-inner animate-hover options-hover quickview-on-hover product-background-none" data-id="${escAttr(product.slug)}" data-product-card>
    <div class="product--card-image width-100 pos-relative">
      <button
        type="button"
        class="kn-fav-btn kn-product-card__fav"
        data-kn-favorite
        data-product-slug="${escAttr(product.slug)}"
        aria-label="${options?.locale?.toLowerCase().startsWith("en") ? "Add to favorites" : "Favorilere ekle"}"
      >♡</button>
      <a href="${escAttr(href)}" aria-label="${title}" class="product--image d-block width-100">
        <div class="media" style="${productImageMediaRatioStyle()}" data-product-media${galleryAttr}>
          <img
            class="product--card-image"
            data-src="${escAttr(image)}"
            src="${escAttr(image)}"
            data-original="${escAttr(imageOriginal)}"
            alt="${title}"
            width="${PRODUCT_IMAGE_WIDTH}"
            height="${PRODUCT_IMAGE_HEIGHT}"
            loading="lazy"
          >
          ${indicatorHtml}
        </div>
      </a>
      <div class="product--card-badges">${badges}</div>
    </div>
    <div class="product--card-detail">
      <div class="product--card-detail-inner">
        <div class="product--card-detail-content">
          <a href="${escAttr(href)}" class="product--title text" aria-label="${title}">${title}</a>
          <div class="product--pricing text">
            <span class="product--actual-price heading-font">${price}</span>
            ${compare}
          </div>
        </div>
        <div class="product--card-detail-button">
          <div class="product-checkout-buttons-outer product--card-form" data-handle="${escAttr(product.slug)}">
            <form action="#" onsubmit="return false">
              <div class="product-checkout-buttons">
                <button
                  type="button"
                  name="add"
                  class="product--icon"
                  data-add-to-cart
                  data-handle="${escAttr(product.slug)}"
                  aria-label="${escAttr(addLabel)}"
                >
                  <span class="width-100 height-100 d-flex">
                    <svg width="17" height="19" viewBox="0 0 17 19" fill="none" class="cart--icon" aria-hidden="true">
                      <path d="M13.8624 5.125H3.13686C2.21555 5.125 1.45202 5.83932 1.39074 6.75859L0.749072 16.3836C0.681732 17.3936 1.48288 18.25 2.49519 18.25H14.5041C15.5164 18.25 16.3176 17.3936 16.2502 16.3836L15.6086 6.75859C15.5472 5.83932 14.7837 5.125 13.8624 5.125Z" stroke="currentColor" stroke-width="1.5"></path>
                      <path d="M12 7.75V4.25C12 2.317 10.433 0.75 8.5 0.75C6.567 0.75 5 2.317 5 4.25V7.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"></path>
                    </svg>
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

export function buildMirrorProductCardHtml(
  product: VitrinCollectionProductCard,
  texts: ResolvedMirrorCollectionTexts,
  options?: { swiperSlide?: boolean; locale?: string },
) {
  return productCardHtml(product, texts, options);
}

export type CollectionPaginationOptions = {
  currentPage?: number;
  basePath?: string;
  /** Veritabanından sayfalanmış liste — products dizisi yalnızca bu sayfa */
  totalCount?: number;
};

function collectionPageHref(basePath: string, page: number) {
  const q = basePath.indexOf("?");
  const path = q >= 0 ? basePath.slice(0, q) : basePath;
  const params = new URLSearchParams(q >= 0 ? basePath.slice(q + 1) : "");
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** DB ürün sayısına göre sayfalama — /collections/all?page=N */
export function patchCollectionPagination(
  doc: Document,
  productCount: number,
  options?: CollectionPaginationOptions,
) {
  const currentPage = Math.max(1, options?.currentPage ?? 1);
  const basePath = options?.basePath ?? "/collections/all";
  const totalPages = Math.ceil(productCount / MIRROR_COLLECTION_PAGE_SIZE);

  doc.querySelectorAll("#MainContent ul.pagination").forEach((ul) => {
    if (productCount <= 0 || totalPages <= 1) {
      ul.remove();
      return;
    }

    const isTr = doc.documentElement.lang?.toLowerCase().startsWith("tr") ?? true;
    const prevLabel = isTr ? "Önceki" : "Previous";
    const nextLabel = isTr ? "Sonraki" : "Next";

    const pages = Array.from({ length: totalPages }, (_, i) => {
      const n = i + 1;
      const active = n === currentPage;
      if (active) {
        return `<li class="pagination-item active"><p class="pagination-text">${n}</p></li>`;
      }
      const href = escAttr(collectionPageHref(basePath, n));
      return `<li class="pagination-item"><a href="${href}" class="pagination-link" aria-label="${isTr ? "Sayfa" : "Page"} ${n}">${n}</a></li>`;
    }).join("");

    const prevDisabled = currentPage <= 1;
    const nextDisabled = currentPage >= totalPages;
    const prevHref = escAttr(collectionPageHref(basePath, currentPage - 1));
    const nextHref = escAttr(collectionPageHref(basePath, currentPage + 1));

    const prev = prevDisabled
      ? `<li class="pagination-item disabled"><p class="pagination-icon" aria-label="${prevLabel}"><strong>${prevLabel}</strong></p></li>`
      : `<li class="pagination-item"><a href="${prevHref}" class="pagination-icon" aria-label="${prevLabel}"><strong>${prevLabel}</strong></a></li>`;

    const next = nextDisabled
      ? `<li class="pagination-item disabled"><p class="pagination-icon" aria-label="${nextLabel}"><strong>${nextLabel}</strong></p></li>`
      : `<li class="pagination-item"><a href="${nextHref}" class="pagination-icon" aria-label="${nextLabel}"><strong>${nextLabel}</strong></a></li>`;

    ul.innerHTML = prev + pages + next;
  });
}

function patchCollectionProductCount(
  doc: Document,
  totalCount: number,
  locale?: string,
  texts?: ResolvedMirrorCollectionTexts,
  page = 1,
) {
  const start = totalCount === 0 ? 0 : (page - 1) * MIRROR_COLLECTION_PAGE_SIZE + 1;
  const end = Math.min(page * MIRROR_COLLECTION_PAGE_SIZE, totalCount);
  const countText = totalCount === 0 ? "0/0" : `${start}-${end}/${totalCount}`;
  const resolved = texts ?? defaultMirrorCollectionTexts(locale);
  const label = totalCount === 1 ? resolved.productCountSingular : resolved.productCountPlural;

  doc.querySelectorAll("[data-total-products-count], .collection-products--count").forEach((el) => {
    el.textContent = countText;
  });
  doc.querySelectorAll(".collection-products--text").forEach((el) => {
    el.textContent = label;
  });
  doc.querySelectorAll("[data-coll-products-count]").forEach((el) => {
    el.setAttribute("data-coll-products-count", String(totalCount));
  });
}

export function applyCollectionProductsFromAdmin(
  doc: Document,
  products: VitrinCollectionProductCard[],
  locale?: string,
  texts?: ResolvedMirrorCollectionTexts,
  pagination?: CollectionPaginationOptions,
) {
  setCollectionProductsAwaiting(doc, false);

  const list = doc.querySelector(
    "#MainContent .main-collection--products-list[main-collection-products], #MainContent .main-collection--products-list",
  );

  const dbPaginated = pagination?.totalCount != null;
  const sorted = dbPaginated ? products : [...products].sort((a, b) => a.title.localeCompare(b.title));
  const resolved = texts ?? defaultMirrorCollectionTexts(locale);
  const currentPage = Math.max(1, pagination?.currentPage ?? 1);
  const totalCount = pagination?.totalCount ?? sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / MIRROR_COLLECTION_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = dbPaginated
    ? sorted
    : sorted.slice(
        (safePage - 1) * MIRROR_COLLECTION_PAGE_SIZE,
        safePage * MIRROR_COLLECTION_PAGE_SIZE,
      );
  const basePath = pagination?.basePath ?? "/collections/all";
  const syncKey = `${safePage}|${basePath}|${totalCount}|${pageItems.map((p) => `${p.slug}:${p.imageUrl ?? ""}:${p.priceMinor}:${p.compareAtMinor ?? ""}:${p.stockQty}`).join(",")}`;

  patchCollectionProductCount(doc, totalCount, locale, resolved, safePage);
  patchCollectionPagination(doc, totalCount, {
    currentPage: safePage,
    basePath,
  });
  if (!list) return;
  if (list.getAttribute("data-kn-products-sync") === syncKey) return;
  list.setAttribute("data-kn-products-sync", syncKey);

  if (!sorted.length) {
    const isTr = locale?.toLowerCase().startsWith("tr") ?? true;
    const empty = isTr ? "Bu listede henüz ürün yok." : "No products in this list yet.";
    list.innerHTML = `<p class="text-center" style="padding:2rem 0;grid-column:1/-1">${escText(empty)}</p>`;
    return;
  }
  list.innerHTML = pageItems
    .map((product) => productCardHtml(product, resolved, { locale }))
    .join("");
  initProductCardGalleries(doc);
}

export function applyCollectionCategoryFiltersFromAdmin(
  doc: Document,
  categories: VitrinCollectionCategoryOption[],
  locale?: string,
  activeCategorySlug?: string,
  texts?: ResolvedMirrorCollectionTexts,
) {
  if (!categories.length) return;

  const label = (texts ?? defaultMirrorCollectionTexts(locale)).categoriesLabel;
  const itemsHtml = categories
    .map((category) => {
      const href = categoryHref(category.slug);
      const active = activeCategorySlug?.trim() === category.slug ? " active" : "";
      const activeAttr = active ? ' aria-current="true"' : "";
      return `<li class="filter-option-item" is="hover-li"><a class="${active.trim()}" href="${escAttr(href)}"${activeAttr}>${escText(category.title)}</a></li>`;
    })
    .join("");

  const normalize = (text: string | null | undefined) =>
    String(text ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const setDropdownButtonLabel = (root: Element | null) => {
    if (!root) return;
    root.querySelectorAll('[data-dropdown-button] span').forEach((span) => {
      if (span.closest("svg")) return;
      span.textContent = label;
    });
  };

  const patchList = (list: Element | null) => {
    if (!list) return;
    list.innerHTML = itemsHtml;
  };

  doc.querySelectorAll("#MainContent custom-dropdown.horizontal-filters--list-item, #MainContent custom-dropdown").forEach((dropdown) => {
    const button = dropdown.querySelector('[data-dropdown-button]');
    const buttonText = normalize(button?.textContent);
    if (buttonText !== "categories" && buttonText !== "kategoriler") return;
    setDropdownButtonLabel(dropdown);
    patchList(dropdown.querySelector(".filter--option-list-items"));
  });

  doc.querySelectorAll("#MainContent .filter--category-menus").forEach((menu) => {
    menu.querySelectorAll(".filter--columns-heading").forEach((heading) => {
      heading.textContent = label;
    });
    setDropdownButtonLabel(menu.closest("custom-dropdown"));
    patchList(menu.querySelector(".filter--option-list-items"));
  });
}

function normalizeFilterLabel(text: string | null | undefined) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function detectFilterKind(text: string, labels: CollectionFilterConfig["labels"]): CollectionFilterKey | null {
  const t = normalizeFilterLabel(text);
  const pairs: [CollectionFilterKey, string[]][] = [
    ["stock", ["availability", "stok durumu", normalizeFilterLabel(labels.stock)]],
    ["price", ["price", "fiyat", normalizeFilterLabel(labels.price)]],
    ["brand", ["brand", "marka", normalizeFilterLabel(labels.brand)]],
    ["tones", ["tones", "tonlar", "shade", "shades", normalizeFilterLabel(labels.tones)]],
    ["volume", ["volume", "hacim", normalizeFilterLabel(labels.volume)]],
    ["quantity", ["quantity", "adet", "miktar", "amount", normalizeFilterLabel(labels.quantity)]],
  ];
  for (const [kind, aliases] of pairs) {
    if (aliases.includes(t)) return kind;
  }
  return null;
}

function checkboxItemHtml(
  id: string,
  name: string,
  value: string,
  label: string,
  checked: boolean,
) {
  return `<li class="filter-option-item radio-box">
    <input type="checkbox" class="checkmark-input" name="${escAttr(name)}" value="${escAttr(value)}" id="${escAttr(id)}"${checked ? " checked" : ""}>
    <span class="checkmark"></span>
    <label class="cursor-pointer" for="${escAttr(id)}">${escText(label)}</label>
  </li>`;
}

function patchCheckboxFilterList(
  list: Element | null,
  name: string,
  items: { value: string; label: string }[],
  active: string[],
  idPrefix: string,
) {
  if (!list || !items.length) return false;
  list.innerHTML = items
    .map((item, index) =>
      checkboxItemHtml(
        `${idPrefix}-${index}`,
        name,
        item.value,
        item.label,
        active.includes(item.value),
      ),
    )
    .join("");
  return true;
}

function patchPriceFilter(root: ParentNode, facets: CollectionFilterFacets, active: ActiveCollectionFilters, label: string) {
  const minTry = Math.floor(facets.price.minMinor / 100);
  const maxTry = Math.ceil(facets.price.maxMinor / 100);
  const currentMin = active.priceMinMinor != null ? Math.floor(active.priceMinMinor / 100) : minTry;
  const currentMax = active.priceMaxMinor != null ? Math.ceil(active.priceMaxMinor / 100) : maxTry;

  root.querySelectorAll(".filter--price-range, .filter--columns-item.filter--price-range").forEach((block) => {
    block.querySelectorAll(".filter--columns-heading").forEach((h) => {
      h.textContent = label;
    });
    block.querySelectorAll(".field-currency").forEach((el) => {
      el.textContent = "₺";
    });
    block.querySelectorAll('input[name="filter.v.price.gte"], input[name="price_min"], #Filter-Price-GTE').forEach((input) => {
      input.setAttribute("name", "price_min");
      input.setAttribute("min", String(minTry));
      input.setAttribute("max", String(maxTry));
      input.setAttribute("value", String(currentMin));
      input.setAttribute("placeholder", String(minTry));
    });
    block.querySelectorAll('input[name="filter.v.price.lte"], input[name="price_max"], #Filter-Price-LTE').forEach((input) => {
      input.setAttribute("name", "price_max");
      input.setAttribute("min", String(minTry));
      input.setAttribute("max", String(maxTry));
      input.setAttribute("value", String(currentMax));
      input.setAttribute("placeholder", String(maxTry));
    });
    block.querySelectorAll(".filter--slider-range.input-min").forEach((input) => {
      input.setAttribute("min", String(minTry));
      input.setAttribute("max", String(maxTry));
      input.setAttribute("value", String(currentMin));
    });
    block.querySelectorAll(".filter--slider-range.input-max").forEach((input) => {
      input.setAttribute("min", String(minTry));
      input.setAttribute("max", String(maxTry));
      input.setAttribute("value", String(currentMax));
    });
  });
}

function hideFilterRoot(root: Element | null) {
  if (!root) return;
  const el = root as HTMLElement;
  el.style.display = "none";
  el.setAttribute("hidden", "");
}

function setDropdownLabel(dropdown: Element, label: string) {
  dropdown.querySelectorAll("[data-dropdown-button] span").forEach((span) => {
    if (span.closest("svg")) return;
    span.textContent = label;
  });
}

function hideOrphanThemeFilters(doc: Document, config: CollectionFilterConfig) {
  const orphanQuantity = new Set(["quantity", "adet", "miktar", "amount"]);
  const hideIfOrphan = (text: string, root: Element | null) => {
    const normalized = normalizeFilterLabel(text);
    if (!orphanQuantity.has(normalized)) return;
    const kind = detectFilterKind(text, config.labels);
    if (kind === "quantity" && config.enabled.quantity) return;
    hideFilterRoot(root);
  };

  doc.querySelectorAll("#MainContent custom-dropdown.horizontal-filters--list-item").forEach((dropdown) => {
    hideIfOrphan(dropdown.querySelector("[data-dropdown-button]")?.textContent ?? "", dropdown);
  });
  doc.querySelectorAll("#MainContent .filter--columns-item").forEach((block) => {
    hideIfOrphan(block.querySelector(".filter--columns-heading")?.textContent ?? "", block);
  });
}

export function applyCollectionFacetFiltersFromAdmin(
  doc: Document,
  facets: CollectionFilterFacets,
  active: ActiveCollectionFilters,
  config: CollectionFilterConfig,
  locale?: string,
) {
  const isTr = locale?.toLowerCase().startsWith("tr") ?? true;
  const stockItems = [
    { value: "in", label: isTr ? "Stokta" : "In stock" },
    { value: "out", label: isTr ? "Stokta yok" : "Out of stock" },
  ];
  const activeStock: string[] = [];
  if (active.stockIn) activeStock.push("in");
  if (active.stockOut) activeStock.push("out");

  const brandItems = facets.brands.map((b) => ({ value: b.slug, label: b.name }));
  const volumeItems = facets.volumes.map((v) => ({ value: v.value, label: v.value }));
  const toneItems = facets.tones.map((t) => ({ value: t.value, label: t.value }));
  const quantityItems = facets.quantities.map((q) => ({
    value: q.value,
    label: formatQuantityFilterLabel(q.value, isTr),
  }));

  const shouldShow = (kind: CollectionFilterKey) => {
    if (!config.enabled[kind]) return false;
    if (kind === "price") return facets.price.maxMinor > facets.price.minMinor || facets.price.maxMinor > 0;
    if (kind === "brand") return brandItems.length > 0;
    if (kind === "volume") return volumeItems.length > 0;
    if (kind === "tones") return toneItems.length > 0;
    if (kind === "quantity") return quantityItems.length > 0;
    if (kind === "stock") return facets.stock.inStock > 0 || facets.stock.outOfStock > 0;
    return false;
  };

  doc.querySelectorAll("#MainContent custom-dropdown.horizontal-filters--list-item").forEach((dropdown) => {
    const buttonText = normalizeFilterLabel(dropdown.querySelector("[data-dropdown-button]")?.textContent);
    const kind = detectFilterKind(buttonText, config.labels);
    if (!kind || kind === "price") return;
    if (!shouldShow(kind)) {
      hideFilterRoot(dropdown);
      return;
    }
    setDropdownLabel(dropdown, config.labels[kind]);
    const list = dropdown.querySelector(".filter--option-list-items");
    if (kind === "stock") {
      patchCheckboxFilterList(list, "stock", stockItems, activeStock, "kn-stock-h");
    } else if (kind === "brand") {
      patchCheckboxFilterList(list, "brand", brandItems, active.brandSlugs, "kn-brand-h");
    } else if (kind === "volume") {
      patchCheckboxFilterList(list, "volume", volumeItems, active.volumes, "kn-volume-h");
    } else if (kind === "tones") {
      patchCheckboxFilterList(list, "tone", toneItems, active.tones, "kn-tone-h");
    } else if (kind === "quantity") {
      patchCheckboxFilterList(list, "quantity", quantityItems, active.quantities, "kn-quantity-h");
    }
  });

  doc.querySelectorAll("#MainContent .filter--columns-item").forEach((block) => {
    const heading = block.querySelector(".filter--columns-heading");
    const kind = detectFilterKind(heading?.textContent ?? "", config.labels);
    if (!kind) return;
    if (!shouldShow(kind)) {
      hideFilterRoot(block);
      return;
    }
    if (heading) heading.textContent = config.labels[kind];
    if (kind === "price") {
      patchPriceFilter(block, facets, active, config.labels.price);
      return;
    }
    const list = block.querySelector(".filter--option-list-items");
    if (kind === "stock") {
      patchCheckboxFilterList(list, "stock", stockItems, activeStock, "kn-stock-v");
    } else if (kind === "brand") {
      patchCheckboxFilterList(list, "brand", brandItems, active.brandSlugs, "kn-brand-v");
    } else if (kind === "volume") {
      patchCheckboxFilterList(list, "volume", volumeItems, active.volumes, "kn-volume-v");
    } else if (kind === "tones") {
      patchCheckboxFilterList(list, "tone", toneItems, active.tones, "kn-tone-v");
    } else if (kind === "quantity") {
      patchCheckboxFilterList(list, "quantity", quantityItems, active.quantities, "kn-quantity-v");
    }
  });

  if (shouldShow("price")) {
    patchPriceFilter(doc, facets, active, config.labels.price);
    doc.querySelectorAll("#MainContent custom-dropdown.horizontal-filters--list-item").forEach((dropdown) => {
      const kind = detectFilterKind(
        dropdown.querySelector("[data-dropdown-button]")?.textContent ?? "",
        config.labels,
      );
      if (kind !== "price") return;
      setDropdownLabel(dropdown, config.labels.price);
    });
  } else {
    doc.querySelectorAll("#MainContent custom-dropdown.horizontal-filters--list-item").forEach((dropdown) => {
      const kind = detectFilterKind(
        dropdown.querySelector("[data-dropdown-button]")?.textContent ?? "",
        config.labels,
      );
      if (kind === "price") hideFilterRoot(dropdown);
    });
    doc.querySelectorAll("#MainContent .filter--columns-item").forEach((block) => {
      const kind = detectFilterKind(block.querySelector(".filter--columns-heading")?.textContent ?? "", config.labels);
      if (kind === "price") hideFilterRoot(block);
    });
  }

  hideOrphanThemeFilters(doc, config);

  injectCollectionFilterBridge(doc, active);
}

function injectCollectionFilterBridge(doc: Document, _active: ActiveCollectionFilters) {
  doc.getElementById("kn-collection-filter-bridge")?.remove();
  const script = doc.createElement("script");
  script.id = "kn-collection-filter-bridge";
  script.textContent = `(function(){
  var KN_FILTER_VER=2;
  if(window.__knCollectionFilterVer===KN_FILTER_VER)return;
  window.__knCollectionFilterVer=KN_FILTER_VER;
  function readList(form,name){
    return Array.prototype.slice.call(form.querySelectorAll('input[name="'+name+'"]:checked')).map(function(el){return el.value;});
  }
  function buildHref(){
    var topLoc=window.top&&window.top.location?window.top.location:window.location;
    var p=new URLSearchParams(topLoc.search||"");
    p.delete("page");
    var form=document.getElementById("horizontalFilterForm")||document.getElementById("filter-sorting-form");
    if(!form)return topLoc.pathname;
    ["brand","volume","tone","quantity","stock","price_min","price_max"].forEach(function(k){p.delete(k);});
    var brands=readList(form,"brand");
    if(brands.length)p.set("brand",brands.join(","));
    var volumes=readList(form,"volume");
    if(volumes.length)p.set("volume",volumes.join(","));
    var tones=readList(form,"tone");
    if(tones.length)p.set("tone",tones.join(","));
    var quantities=readList(form,"quantity");
    if(quantities.length)p.set("quantity",quantities.join(","));
    var stock=readList(form,"stock");
    if(stock.length)p.set("stock",stock.join(","));
    var min=form.querySelector('input[name="price_min"]');
    var max=form.querySelector('input[name="price_max"]');
    if(min&&min.value)p.set("price_min",min.value);
    if(max&&max.value)p.set("price_max",max.value);
    var q=p.toString();
    return topLoc.pathname+(q?"?"+q:"");
  }
  function bindForm(form){
    if(!form||form.__knFilterBridge)return;
    form.__knFilterBridge=1;
    form.addEventListener("change",function(){
      var href=buildHref();
      if(window.top&&window.top!==window)window.top.location.href=href;
      else window.location.href=href;
    });
    form.addEventListener("submit",function(e){
      e.preventDefault();
      var href=buildHref();
      if(window.top&&window.top!==window)window.top.location.href=href;
      else window.location.href=href;
    });
  }
  bindForm(document.getElementById("horizontalFilterForm"));
  bindForm(document.getElementById("filter-sorting-form"));
})();`;
  (doc.body ?? doc.documentElement).appendChild(script);
}

/** /collections/{slug} — banner başlık ve açıklama */
export function applyCollectionDetailFromAdmin(doc: Document, col: VitrinCollectionDetail) {
  const titleEl = doc.querySelector(".page--title");
  if (titleEl) titleEl.textContent = col.title;

  const desc = col.description?.trim() ?? "";
  const descEl = doc.querySelector(".page--desc");
  if (descEl) {
    descEl.textContent = desc;
    (descEl as HTMLElement).style.display = desc ? "" : "none";
  }

  if (col.imageUrl?.trim()) {
    const banner = doc.querySelector(".page-banner");
    banner?.querySelectorAll("img").forEach((img) => {
      const el = img as HTMLImageElement;
      el.src = col.imageUrl!.trim();
      el.setAttribute("data-src", col.imageUrl!.trim());
    });
  }
}
