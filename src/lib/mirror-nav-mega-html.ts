import type { MegaNavProduct, ResolvedNavColumn } from "@/lib/mirror-nav-resolve";
import type { NavMenuMegaMeta } from "@/lib/nav-menu-link";

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function dropdownLinksHtml(links: { href: string; label: string }[]): string {
  return links
    .map((l) => `<li><a href="${escAttr(l.href)}">${escText(l.label)}</a></li>`)
    .join("");
}

function pickFeaturedLink(columns: ResolvedNavColumn[]) {
  for (const col of columns) {
    for (const link of col.links) {
      if (link.href.startsWith("/products/")) return link;
    }
  }
  for (const col of columns) {
    if (col.links[0]) return col.links[0];
    if (col.href) return { href: col.href, label: col.title };
  }
  return null;
}

function megaImageSlots(mega?: NavMenuMegaMeta) {
  const featuredUrl = mega?.featuredImageUrl?.trim() ?? "";
  const featuredUrl2 = mega?.featuredImageUrl2?.trim() ?? "";
  const secondaryUrl =
    mega?.featuredSecondaryImageUrl?.trim() || mega?.promoImageUrl?.trim() || "";
  const secondaryUrl2 = mega?.promoImageUrl2?.trim() ?? "";
  return {
    featuredUrl,
    featuredUrl2,
    secondaryUrl,
    secondaryUrl2,
    hasFeatured: Boolean(featuredUrl),
    hasFeatured2: Boolean(featuredUrl2),
    hasSecondary: Boolean(secondaryUrl),
    hasSecondary2: Boolean(secondaryUrl2),
  };
}

type MegaImageTile = { href: string; imageUrl: string; title: string };

function buildMegaProductCard(p: MegaNavProduct): string {
  const img = p.imageUrl ? ` style="background-image:url('${escAttr(p.imageUrl)}')"` : "";
  const compare = p.compareLabel
    ? `<span class="kn-nav-mega__product-compare">${escText(p.compareLabel)}</span>`
    : "";
  return `<a href="${escAttr(p.href)}" class="kn-nav-mega__product" role="listitem">
  <span class="kn-nav-mega__product-img"${img} aria-hidden="true"></span>
  <span class="kn-nav-mega__product-title">${escText(p.title)}</span>
  <span class="kn-nav-mega__product-prices"><span class="kn-nav-mega__product-price">${escText(p.priceLabel)}</span>${compare}</span>
</a>`;
}

/** Yatay şerit — her iki kartta da görsel varken */
function buildMegaProductsStripHtml(products: MegaNavProduct[]): string {
  if (!products.length) return "";
  return `<div class="kn-nav-mega__products-wrap kn-nav-mega__products-wrap--strip">
  <div class="kn-nav-mega__products-track" role="list">${products.map(buildMegaProductCard).join("")}</div>
</div>`;
}

/** Kart yuvası — görsel yoksa ızgara ürün listesi */
function buildMegaProductsSlotHtml(products: MegaNavProduct[]): string {
  if (!products.length) return "";
  const quadClass = products.length >= 4 ? " kn-nav-mega__products-slot--quad" : "";
  return `<div class="kn-nav-mega__products-wrap kn-nav-mega__products-wrap--slot">
  <div class="kn-nav-mega__products-slot${quadClass}" role="list">${products.map(buildMegaProductCard).join("")}</div>
</div>`;
}

function buildSingleImageTileInner(href: string, imageUrl: string, title: string): string {
  return `<a href="${escAttr(href)}" class="kn-nav-mega__tile">
    <span class="kn-nav-mega__tile-img" aria-hidden="true" style="background-image:url('${escAttr(imageUrl)}')"></span>
    <span class="kn-nav-mega__tile-title">${escText(title)}</span>
  </a>`;
}

function buildImageColumnHtml(
  tiles: MegaImageTile[],
  secondary = false,
): string {
  if (!tiles.length) return "";
  const colClass = secondary
    ? "col-md-6 col-sm-12 kn-nav-mega__tile-col kn-nav-mega__tile-col--secondary"
    : "col-md-6 col-sm-12 kn-nav-mega__tile-col";
  if (tiles.length === 1) {
    const t = tiles[0]!;
    return `<div class="${colClass}">${buildSingleImageTileInner(t.href, t.imageUrl, t.title)}</div>`;
  }
  const stackClass =
    tiles.length >= 2 ? " kn-nav-mega__tile-col--stack" : "";
  const stackHtml = tiles
    .map((t) => buildSingleImageTileInner(t.href, t.imageUrl, t.title))
    .join("");
  return `<div class="${colClass}${stackClass}"><div class="kn-nav-mega__tile-stack">${stackHtml}</div></div>`;
}

function buildImageTileHtml(href: string, imageUrl: string, title: string, secondary = false): string {
  return buildImageColumnHtml([{ href, imageUrl, title }], secondary);
}

function splitProductsForSlots(
  products: MegaNavProduct[],
  emptySlotCount: 0 | 1 | 2,
  fillFirstSlot: boolean,
): { slot1: MegaNavProduct[]; slot2: MegaNavProduct[]; strip: MegaNavProduct[] } {
  if (!products.length) {
    return { slot1: [], slot2: [], strip: [] };
  }
  if (emptySlotCount === 0) {
    return { slot1: [], slot2: [], strip: products };
  }
  if (emptySlotCount === 1) {
    return fillFirstSlot
      ? { slot1: products, slot2: [], strip: [] }
      : { slot1: [], slot2: products, strip: [] };
  }
  const mid = Math.ceil(products.length / 2);
  return { slot1: products.slice(0, mid), slot2: products.slice(mid), strip: [] };
}

function buildMegaAsideHtml(
  columns: ResolvedNavColumn[],
  locale: "tr" | "en" = "tr",
  mega?: NavMenuMegaMeta,
  products: MegaNavProduct[] = [],
): string {
  const tr = locale === "tr";
  const featured = pickFeaturedLink(columns);
  const promoHref = columns.find((c) => c.href)?.href ?? featured?.href ?? "/collections/all";
  const featuredHref = featured?.href ?? promoHref;
  const titleFeatured =
    locale === "tr"
      ? mega?.featuredTitleTr?.trim() || featured?.label || "Yeni Gelenler"
      : mega?.featuredTitleEn?.trim() || featured?.label || "New Arrivals";
  const titleFeatured2 =
    locale === "tr"
      ? mega?.featuredTitle2Tr?.trim() || "Öne Çıkanlar"
      : mega?.featuredTitle2En?.trim() || "Highlights";
  const titleSecondary =
    locale === "tr"
      ? mega?.promoTitleTr?.trim() || mega?.featuredTitleTr?.trim() || "Çok Satanlar"
      : mega?.promoTitleEn?.trim() || mega?.featuredTitleEn?.trim() || "Best Sellers";
  const titleSecondary2 =
    locale === "tr"
      ? mega?.promoTitle2Tr?.trim() || "Kampanyalar"
      : mega?.promoTitle2En?.trim() || "Promotions";

  const {
    featuredUrl,
    featuredUrl2,
    secondaryUrl,
    secondaryUrl2,
    hasFeatured,
    hasFeatured2,
    hasSecondary,
    hasSecondary2,
  } = megaImageSlots(mega);

  const leftTiles: MegaImageTile[] = [];
  if (hasFeatured) leftTiles.push({ href: featuredHref, imageUrl: featuredUrl, title: titleFeatured });
  if (hasFeatured2) leftTiles.push({ href: featuredHref, imageUrl: featuredUrl2, title: titleFeatured2 });

  const rightTiles: MegaImageTile[] = [];
  if (hasSecondary) rightTiles.push({ href: promoHref, imageUrl: secondaryUrl, title: titleSecondary });
  if (hasSecondary2) rightTiles.push({ href: promoHref, imageUrl: secondaryUrl2, title: titleSecondary2 });

  const hasLeftImages = leftTiles.length > 0;
  const hasRightImages = rightTiles.length > 0;
  const emptySlots = (!hasLeftImages ? 1 : 0) + (!hasRightImages ? 1 : 0);
  const { slot1: slot1Products, slot2: slot2Products, strip: stripProducts } = splitProductsForSlots(
    products,
    emptySlots as 0 | 1 | 2,
    !hasLeftImages,
  );

  const cols: string[] = [];

  if (hasLeftImages) {
    cols.push(buildImageColumnHtml(leftTiles, false));
  } else if (slot1Products.length) {
    cols.push(
      `<div class="col-md-6 col-sm-12 kn-nav-mega__tile-col kn-nav-mega__tile-col--products">${buildMegaProductsSlotHtml(slot1Products)}</div>`,
    );
  }

  if (hasRightImages) {
    cols.push(buildImageColumnHtml(rightTiles, true));
  } else if (slot2Products.length) {
    cols.push(
      `<div class="col-md-6 col-sm-12 kn-nav-mega__tile-col kn-nav-mega__tile-col--products kn-nav-mega__tile-col--secondary">${buildMegaProductsSlotHtml(slot2Products)}</div>`,
    );
  }

  const stripHtml = buildMegaProductsStripHtml(stripProducts);

  if (!cols.length && !stripHtml) {
    return "";
  }

  const productCount = slot1Products.length || slot2Products.length;
  const imageStackCount = Math.max(leftTiles.length, rightTiles.length);
  const balanced =
    productCount >= 4 && imageStackCount >= 2 ? " kn-nav-mega__aside-row--balanced" : "";

  return `<div class="col-md-6 col-sm-6 mega-img kn-nav-mega__aside">
    <div class="row megaproimg kn-nav-mega__aside-row${balanced}">${cols.join("")}</div>
    ${stripHtml}
  </div>`;
}

/** Fruitser tarzı mega menü — sol kategori ızgarası + sağ öne çıkan alan */
export function buildMegaDropdownHtml(
  columns: ResolvedNavColumn[],
  locale: "tr" | "en" = "tr",
  mega?: NavMenuMegaMeta,
  products: MegaNavProduct[] = [],
  viewAll?: { href: string; label: string },
): string {
  if (!columns.length) return "";

  const colBlocks = columns
    .map((col) => {
      const heading = col.title?.trim() ?? "";
      const title = heading
        ? col.href
          ? `<a class="currentm kn-nav-mega__heading" href="${escAttr(col.href)}">${escText(heading)}</a>`
          : `<span class="currentm kn-nav-mega__heading">${escText(heading)}</span>`
        : "";
      const links = col.links.length
        ? `<ul class="kn-nav-mega__links">${dropdownLinksHtml(col.links)}</ul>`
        : "";
      if (!title && !links.length) return "";
      return `<div class="inner kn-nav-mega__inner">${title}${links}</div>`;
    })
    .filter(Boolean)
    .join("");

  const viewAllHref = viewAll?.href?.trim() ?? columns.find((c) => c.href)?.href ?? "";
  const viewAllLabel =
    viewAll?.label?.trim() ??
    (locale === "tr" ? "Tümünü gör" : "View all");
  const viewAllHtml = viewAllHref
    ? `<p class="kn-nav-mega__view-all"><a href="${escAttr(viewAllHref)}">${escText(viewAllLabel)} →</a></p>`
    : "";

  const aside = buildMegaAsideHtml(columns, locale, mega, products);

  return `<div class="kn-nav-dropdown kn-nav-dropdown--mega kn-nav-dropdown--fruitser" data-kn-nav-dropdown>
  <div class="kn-nav-dropdown__panel">
    <div class="style_1 row kn-nav-mega__row">
      <div class="parent-mega-menu parent-mega-menu col-md-6 col-sm-6 kn-nav-mega__left">
        <div class="row kn-nav-mega__categories">${colBlocks}</div>
        ${viewAllHtml}
      </div>
      ${aside}
    </div>
  </div>
</div>`;
}
