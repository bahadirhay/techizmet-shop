/** Sayfa altı "EXPLORE / Keşfet" — lifestyle görsel + tıklanınca çıkan ürünler */
export type ProductExploreLook = {
  imageUrl: string;
  label: string;
  productSlugs: string[];
};

export const DEFAULT_EXPLORE_LABEL = "EXPLORE";

/** Admin: "Mağaza varsayılanını kullan" seçiliyken DB'de saklanır (null = Keşfet kapalı) */
export const SITE_DEFAULT_EXPLORE_SENTINEL = "__kn:site_default__";

export function isSiteDefaultExploreJson(raw: string | null | undefined): boolean {
  return raw?.trim() === SITE_DEFAULT_EXPLORE_SENTINEL;
}

export function parseExploreLooksJson(raw: string | null | undefined): ProductExploreLook[] | null {
  if (!raw?.trim() || isSiteDefaultExploreJson(raw)) return null;
  try {
    const arr = JSON.parse(raw) as ProductExploreLook[];
    if (!Array.isArray(arr)) return null;
    return arr
      .filter((x) => x && typeof x.imageUrl === "string" && x.imageUrl.trim())
      .map((x) => ({
        imageUrl: x.imageUrl.trim(),
        label: String(x.label ?? DEFAULT_EXPLORE_LABEL).trim() || DEFAULT_EXPLORE_LABEL,
        productSlugs: Array.isArray(x.productSlugs)
          ? x.productSlugs.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          : [],
      }));
  } catch {
    return null;
  }
}

export function serializeExploreLooks(looks: ProductExploreLook[]): string {
  return JSON.stringify(looks);
}

/** Mirror PDP — collections_grid / discover-look bölümü */
export function extractProductExploreLooks(html: string): ProductExploreLook[] {
  const gridStart = html.indexOf('class="shopify-section section-collections-grid"');
  if (gridStart < 0) return [];
  const gridEnd = html.indexOf("</collection-product-grid>", gridStart);
  const block = gridEnd > gridStart ? html.slice(gridStart, gridEnd) : html.slice(gridStart);

  const looks: ProductExploreLook[] = [];
  const parts = block.split('class="product-grid-card"');
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const imgM =
      chunk.match(/data-original="(\/theme\/techizmet-shop\/cdn\/shop\/files\/[^"?]+)/i) ||
      chunk.match(/src="(\/theme\/techizmet-shop\/cdn\/shop\/files\/[^"?]+)/i);
    if (!imgM) continue;

    const imageUrl = imgM[1].split("?")[0];
    const slugs: string[] = [];
    const listPart = chunk.includes("discover-list-wrapper")
      ? chunk.slice(chunk.indexOf("discover-list-wrapper"))
      : chunk;
    const hrefRe = /href="([a-z0-9-]+)\.html"/gi;
    for (const hm of listPart.matchAll(hrefRe)) {
      const slug = hm[1];
      if (!slugs.includes(slug)) slugs.push(slug);
    }

    looks.push({
      imageUrl,
      label: DEFAULT_EXPLORE_LABEL,
      productSlugs: slugs,
    });
    if (looks.length >= 3) break;
  }
  return looks;
}

export type ExploreOverlayProduct = {
  slug: string;
  title: string;
  imageUrl: string | null;
  priceLabel: string;
  href: string;
};

/** Vitrin iframe içinde EXPLORE kartlarını günceller; şablondan kalan ürünleri temizler */
export function applyExploreLooksOverlay(
  doc: Document,
  looks: ProductExploreLook[],
  productsBySlug: Record<string, ExploreOverlayProduct>,
) {
  const section = doc.querySelector(
    "#MainContent .shopify-section.section-collections-grid, #MainContent .section-collections-grid",
  ) as HTMLElement | null;

  if (!looks.length) {
    if (section) section.style.display = "none";
    return;
  }

  if (section) section.style.display = "";

  const cards = doc.querySelectorAll(".collection-list-grid .product-grid-card");
  cards.forEach((card, i) => {
    const el = card as HTMLElement;
    const look = looks[i];
    if (!look) {
      el.style.display = "none";
      return;
    }

    el.style.display = "";

    const lifestyleImg = card.querySelector(
      ".discover-look-wrapper > .media img, .discover-look-wrapper .media img",
    ) as HTMLImageElement | null;
    if (lifestyleImg && look.imageUrl?.trim()) {
      const url = look.imageUrl.trim();
      lifestyleImg.src = url;
      lifestyleImg.setAttribute("data-original", url);
      lifestyleImg.removeAttribute("data-src");
      lifestyleImg.classList.remove("lazyload");
    }

    const labelEl = card.querySelector(".discover_data");
    if (labelEl && look.label) labelEl.textContent = look.label;

    const wrapper = card.querySelector(".discover-list-wrapper");
    if (!wrapper) return;

    const slugs = look.productSlugs.filter((slug) => productsBySlug[slug]);
    const lists = [...wrapper.querySelectorAll(".discover-list")];

    lists.forEach((listEl, listIdx) => {
      const slug = slugs[listIdx];
      if (!slug) {
        listEl.remove();
        return;
      }

      const p = productsBySlug[slug];
      if (!p) {
        listEl.remove();
        return;
      }

      const titleA = listEl.querySelector(".product--title") as HTMLAnchorElement | null;
      if (titleA) {
        titleA.href = p.href;
        titleA.textContent = p.title;
        titleA.setAttribute("aria-label", p.title);
      }

      const img = listEl.querySelector(".product--card-image img") as HTMLImageElement | null;
      if (img && p.imageUrl) {
        img.src = p.imageUrl;
        img.setAttribute("data-original", p.imageUrl);
        img.removeAttribute("data-src");
        img.classList.remove("lazyload");
        img.alt = p.title;
      }

      const priceEl = listEl.querySelector(".product--actual-price");
      if (priceEl && p.priceLabel) priceEl.textContent = p.priceLabel;

      listEl.querySelectorAll("a.product--image, a.product--icon").forEach((anchor) => {
        if (anchor instanceof HTMLAnchorElement) anchor.href = p.href;
      });

      const cardRoot = listEl.querySelector("[data-product-card]");
      if (cardRoot) cardRoot.setAttribute("data-id", p.slug);
    });
  });
}
