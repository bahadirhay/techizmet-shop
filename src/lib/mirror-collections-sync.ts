import { parseHTML } from "linkedom";
import { formatTry } from "@/lib/format";
import { formatPercentOffBadge, percentOffFromPrices } from "@/lib/product-discount";
import type { ResolvedMirrorCollectionTexts } from "@/lib/store-static-texts";

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
  priceMinor: number;
  compareAtMinor?: number | null;
  stockQty: number;
  lowStockThreshold: number;
  badgesJson?: string | null;
};

export type VitrinCollectionCategoryOption = {
  slug: string;
  title: string;
};

const EMPTY_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

/** Shopify mirror şablonundaki sayfa başına ürün (eski tema) */
export const MIRROR_COLLECTION_PAGE_SIZE = 24;

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

/** Sunucu / prebuild — ana sayfa koleksiyon kartları */
export function applyCollectionsCardsToMirrorHtml(html: string, collections: VitrinCollectionCard[]): string {
  if (!collections.length) return html;
  const { document } = parseHTML(html);
  applyCollectionsCardsFromAdmin(document, collections);
  document.documentElement.setAttribute("data-kn-collections-server", "1");
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
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
) {
  const href = productHref(product.slug);
  const title = escText(product.title);
  const image = product.imageUrl?.trim() || EMPTY_IMAGE;
  const price = escText(formatTry(product.priceMinor));
  const compare = product.compareAtMinor && product.compareAtMinor > product.priceMinor
    ? `<span class="product--cut-price line-through">${escText(formatTry(product.compareAtMinor))}</span>`
    : "";
  const badges = productBadgeHtml(product, texts);

  return `<div class="product--card" is="card-animate">
  <div class="product--card-inner animate-hover options-hover quickview-on-hover product-background-none" data-id="${escAttr(product.slug)}" data-product-card>
    <div class="product--card-image width-100 pos-relative">
      <a href="${escAttr(href)}" aria-label="${title}" class="product--image d-block width-100">
        <div class="media" style="--image_ratio:128.64493996569468%" data-product-media>
          <img
            class="product--card-image"
            data-src="${escAttr(image)}"
            src="${escAttr(image)}"
            data-original="${escAttr(image)}"
            alt="${title}"
            loading="lazy"
          >
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
          <div class="product-checkout-buttons-outer product--card-form">
            <a href="${escAttr(href)}" class="product--icon" aria-label="${title}">
              <span class="width-100 height-100 d-flex">
                <svg width="17" height="19" viewBox="0 0 17 19" fill="none" class="cart--icon" aria-hidden="true">
                  <path d="M13.8624 5.125H3.13686C2.21555 5.125 1.45202 5.83932 1.39074 6.75859L0.749072 16.3836C0.681732 17.3936 1.48288 18.25 2.49519 18.25H14.5041C15.5164 18.25 16.3176 17.3936 16.2502 16.3836L15.6086 6.75859C15.5472 5.83932 14.7837 5.125 13.8624 5.125Z" stroke="currentColor" stroke-width="1.5"></path>
                  <path d="M12 7.75V4.25C12 2.317 10.433 0.75 8.5 0.75C6.567 0.75 5 2.317 5 4.25V7.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"></path>
                </svg>
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

export type CollectionPaginationOptions = {
  currentPage?: number;
  basePath?: string;
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
  const list = doc.querySelector(
    "#MainContent .main-collection--products-list[main-collection-products], #MainContent .main-collection--products-list",
  );

  const sorted = [...products].sort((a, b) => a.title.localeCompare(b.title));
  const resolved = texts ?? defaultMirrorCollectionTexts(locale);
  const currentPage = Math.max(1, pagination?.currentPage ?? 1);
  const totalPages = Math.max(1, Math.ceil(sorted.length / MIRROR_COLLECTION_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = sorted.slice(
    (safePage - 1) * MIRROR_COLLECTION_PAGE_SIZE,
    safePage * MIRROR_COLLECTION_PAGE_SIZE,
  );
  const basePath = pagination?.basePath ?? "/collections/all";
  const syncKey = `${safePage}|${basePath}|${pageItems.map((p) => `${p.slug}:${p.imageUrl ?? ""}:${p.priceMinor}:${p.compareAtMinor ?? ""}:${p.stockQty}`).join(",")}`;

  patchCollectionProductCount(doc, sorted.length, locale, resolved, safePage);
  patchCollectionPagination(doc, sorted.length, {
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
  list.innerHTML = pageItems.map((product) => productCardHtml(product, resolved)).join("");
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
