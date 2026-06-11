/** Koleksiyon sekmeleri — İPEKİ / PETAL / HYDRA + sekme ürünleri (TR + EN) */

import { isAnchorNode, isElementNode, isImageNode } from "@/lib/mirror-dom-node";
import type { ShopLocale } from "@/lib/i18n/locale";

export type CollectionsTabProductEdit = {
  key: string;
  href: string;
  /** @deprecated — titleTr kullanın */
  title?: string;
  titleTr: string;
  titleEn: string;
  imageUrl?: string;
  /** Vitrin fiyat metni — mağaza ürününden (örn. 149,00 ₺) */
  priceText?: string;
  /** Vitrinde bu ürün kartını gizle */
  hidden?: boolean;
};

export type CollectionsTabItemEdit = {
  tabId: string;
  /** @deprecated — labelTr kullanın */
  label?: string;
  labelTr: string;
  labelEn: string;
  products: CollectionsTabProductEdit[];
  /** Sekmeyi vitrinde gösterme (ör. yalnızca DOĞAL) */
  hidden?: boolean;
  /** Fiyat / sepet ikonu satırını göster (varsayılan: göster) */
  showPricing?: boolean;
  /** Sekmede kaç ürün kartı görünsün (boş = hepsi) */
  visibleProductCount?: number;
};

const TAB_EN_FALLBACK: Record<string, string> = {
  collection_Mqq76T: "SILKEN",
  collection_pgVjfw: "PETAL",
  collection_UUAbNV: "HYDRA",
};

/** TR mirror HTML’de hâlâ İngilizce sekme adı varsa varsayılan Türkçe */
const TAB_TR_FALLBACK: Record<string, string> = {
  collection_Mqq76T: "İPEKİ",
  collection_pgVjfw: "PETAL",
  collection_UUAbNV: "HYDRA",
};

function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<section[^>]*__${esc}"[\\s\\S]*?</section>`, "i"))?.[0] ?? "";
}

function productKeyFromHref(href: string, index: number): string {
  const m = href.match(/\/products\/([^/?#]+)/i);
  return m?.[1] ?? `item-${index}`;
}

function tabContentBlock(sectionBlock: string, tabId: string): string {
  const marker = `data-content-id="${tabId}"`;
  const start = sectionBlock.indexOf(marker);
  if (start < 0) return "";
  const next = sectionBlock.indexOf('data-content-id="', start + marker.length);
  return next > 0 ? sectionBlock.slice(start, next) : sectionBlock.slice(start, start + 120000);
}

function productSlugFromHref(href: string): string | null {
  const m = href.match(/\/products\/([^/?#]+)/i);
  if (!m) return null;
  return m[1].replace(/\.html$/i, "");
}

function extractProductsFromTabBlock(block: string): Omit<CollectionsTabProductEdit, "titleTr" | "titleEn">[] {
  const products: Omit<CollectionsTabProductEdit, "titleTr" | "titleEn">[] = [];
  const innerRe =
    /<a\s[^>]*href="([^"]+)"[^>]*collections-tab--menu-content-item-inner[\s\S]*?collections-tab--menu-content-title[^>]*>([\s\S]*?)<\/h6>/gi;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = innerRe.exec(block))) {
    const href = m[1];
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    const chunk = m[0];
    const imageUrl =
      chunk.match(/data-original="([^"]+)"/i)?.[1] ??
      chunk.match(/\ssrc="(\/theme\/techizmet-shop\/[^"]+)"/i)?.[1];
    const priceText =
      chunk.match(/class="product--actual-price[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1]?.replace(/<[^>]+>/g, "").trim() ||
      undefined;
    products.push({
      key: productKeyFromHref(href, i),
      href: href.trim(),
      title,
      imageUrl: imageUrl?.split("?")[0],
      priceText,
    });
    i += 1;
  }
  return products;
}

function extractTabsFromBlock(block: string): Array<{ tabId: string; label: string; products: ReturnType<typeof extractProductsFromTabBlock> }> {
  const tabs: Array<{ tabId: string; label: string; products: ReturnType<typeof extractProductsFromTabBlock> }> = [];
  const menuRe =
    /<li[^>]*collections-tab--menu-item[^>]*data-tab-id="([^"]+)"[^>]*>[\s\S]*?collections-tab--menu-item-link[^>]*>([\s\S]*?)<\/span>/gi;
  let m: RegExpExecArray | null;
  while ((m = menuRe.exec(block))) {
    const tabId = m[1];
    const label = m[2].replace(/<[^>]+>/g, "").trim();
    tabs.push({
      tabId,
      label,
      products: extractProductsFromTabBlock(tabContentBlock(block, tabId)),
    });
  }
  return tabs;
}

export function extractCollectionsTabFromHtml(
  html: string,
  sectionKey: string,
): CollectionsTabItemEdit[] {
  const trTabs = extractTabsFromBlock(sliceSectionHtml(html, sectionKey));
  return trTabs.map((t) => ({
    tabId: t.tabId,
    label: t.label,
    labelTr: t.label,
    labelEn: TAB_EN_FALLBACK[t.tabId] ?? t.label,
    products: t.products.map((p) => ({
      ...p,
      titleTr: p.title ?? "",
      titleEn: p.title ?? "",
    })),
  }));
}

/** TR + EN HTML birleştirerek varsayılanlar (istemci güvenli — fs yok) */
export function buildCollectionsTabBilingualDefaults(
  trHtml: string,
  enHtml: string,
  sectionKey: string,
): CollectionsTabItemEdit[] {
  const trTabs = extractTabsFromBlock(sliceSectionHtml(trHtml, sectionKey));
  const enTabs = extractTabsFromBlock(sliceSectionHtml(enHtml, sectionKey));

  return trTabs.map((t, ti) => {
    const enTab = enTabs.find((e) => e.tabId === t.tabId) ?? enTabs[ti];
    const labelEn = enTab?.label ?? TAB_EN_FALLBACK[t.tabId] ?? t.label;
    const labelTr = TAB_TR_FALLBACK[t.tabId] ?? t.label;
    return {
      tabId: t.tabId,
      label: labelTr,
      labelTr,
      labelEn,
      products: t.products.map((p, pi) => {
        const enP = enTab?.products.find((e) => e.key === p.key) ?? enTab?.products[pi];
        const titleTr = p.title ?? "";
        const titleEn = enP?.title ?? titleTr;
        return {
          ...p,
          title: titleTr,
          titleTr,
          titleEn,
        };
      }),
    };
  });
}

export function collectionsTabLabel(tab: CollectionsTabItemEdit, locale: ShopLocale): string {
  if (locale === "tr") return tab.labelTr?.trim() || tab.label?.trim() || tab.labelEn || "";
  return tab.labelEn?.trim() || tab.label?.trim() || tab.labelTr || "";
}

export function collectionsTabProductTitle(p: CollectionsTabProductEdit, locale: ShopLocale): string {
  if (locale === "tr") return p.titleTr?.trim() || p.title?.trim() || p.titleEn || "";
  return p.titleEn?.trim() || p.title?.trim() || p.titleTr || "";
}

/** Mağaza ürün listesinden sekme kartlarını doldur (başlık, görsel, fiyat) */
export function enrichCollectionsTabsFromProductOptions<
  T extends { slug: string; title: string; imageUrl?: string | null; priceLabel: string },
>(tabs: CollectionsTabItemEdit[], options: T[]): CollectionsTabItemEdit[] {
  if (!options.length) return tabs;
  const bySlug = new Map(options.map((o) => [o.slug, o]));
  return tabs.map((tab) => ({
    ...tab,
    products: tab.products.map((p) => {
      const slug =
        productSlugFromHref(p.href) ||
        (p.key?.trim() && !p.key.startsWith("item-") ? p.key.replace(/\.html$/i, "") : null);
      const product = slug ? bySlug.get(slug) : undefined;
      if (!product) return p;
      return {
        ...p,
        key: product.slug,
        href: `/products/${product.slug}`,
        titleTr: product.title,
        titleEn: product.title,
        title: product.title,
        imageUrl: product.imageUrl ?? p.imageUrl,
        priceText: product.priceLabel,
      };
    }),
  }));
}

function setImg(el: Element, url: string) {
  const bust = url.includes("?") ? url : `${url}?kn=1`;
  el.querySelectorAll("img").forEach((img) => {
    if (!isImageNode(img)) return;
    img.src = bust;
    img.setAttribute("data-original", url);
    img.setAttribute("data-src", url);
    img.setAttribute("srcset", `${bust} 1x, ${bust} 2x`);
    img.removeAttribute("data-srcset");
  });
}

function setElementDisplay(el: Element | null | undefined, display: string | null) {
  if (!isElementNode(el)) return;
  if (!display) el.style.removeProperty("display");
  else el.style.display = display;
}

export function applyCollectionsTabToSection(
  sectionEl: Element,
  tabs: CollectionsTabItemEdit[],
  locale: ShopLocale = "tr",
) {
  let firstVisibleTab = true;

  for (const tab of tabs) {
    const menuLi = sectionEl.querySelector(`[data-tab-id="${tab.tabId}"]`);
    const content = sectionEl.querySelector(`[data-content-id="${tab.tabId}"]`);

    if (tab.hidden) {
      setElementDisplay(menuLi, "none");
      setElementDisplay(content, "none");
      content?.classList.remove("active");
      menuLi?.classList.remove("active");
      continue;
    }

    setElementDisplay(menuLi, null);
    setElementDisplay(content, null);

    const isActive = firstVisibleTab;
    menuLi?.classList.toggle("active", isActive);
    content?.classList.toggle("active", isActive);
    if (isActive) firstVisibleTab = false;

    const labelEl = menuLi?.querySelector(".collections-tab--menu-item-link");
    const label = collectionsTabLabel(tab, locale);
    if (labelEl && label) labelEl.textContent = label;

    if (!content || !tab.products.length) continue;

    const showPricing = tab.showPricing !== false;
    const maxVisible =
      tab.visibleProductCount != null && tab.visibleProductCount > 0
        ? Math.floor(tab.visibleProductCount)
        : undefined;

    const boxes = content.querySelectorAll(".collections-tab--menu-content-item-box");
    tab.products.forEach((p, idx) => {
      const box = boxes[idx];
      if (!box) return;

      const hideProduct = Boolean(p.hidden) || (maxVisible != null && idx >= maxVisible);
      setElementDisplay(box, hideProduct ? "none" : null);
      if (hideProduct) return;

      const link = box.querySelector("a.collections-tab--menu-content-item-inner");
      if (isAnchorNode(link) && p.href) link.href = p.href;
      const title = box.querySelector(".collections-tab--menu-content-title");
      const titleText = collectionsTabProductTitle(p, locale);
      if (title && titleText) title.textContent = titleText;
      if (p.imageUrl) {
        const imgWrap = box.querySelector(".collections-tab--menu-content-image");
        if (imgWrap) setImg(imgWrap, p.imageUrl);
      }
      const priceEl = box.querySelector(".product--actual-price");
      if (showPricing && priceEl && p.priceText?.trim()) {
        priceEl.textContent = p.priceText.trim();
        setElementDisplay(box.querySelector(".collections-tab--info"), null);
      } else if (!showPricing) {
        setElementDisplay(box.querySelector(".collections-tab--info"), "none");
      }
    });
  }
}

function normalizeTab(tab: CollectionsTabItemEdit): CollectionsTabItemEdit {
  const labelTr = tab.labelTr?.trim() || tab.label?.trim() || "";
  const labelEn = tab.labelEn?.trim() || TAB_EN_FALLBACK[tab.tabId] || labelTr;
  return {
    ...tab,
    label: labelTr,
    labelTr,
    labelEn,
    products: tab.products.map((p) => {
      const titleTr = p.titleTr?.trim() || p.title?.trim() || "";
      const titleEn = p.titleEn?.trim() || titleTr;
      return { ...p, title: titleTr, titleTr, titleEn };
    }),
  };
}

export function mergeCollectionsTabEdits(
  defaults: CollectionsTabItemEdit[] | undefined,
  edits: CollectionsTabItemEdit[] | undefined,
): CollectionsTabItemEdit[] {
  if (!defaults?.length) return (edits ?? []).map(normalizeTab);
  if (!edits?.length) return defaults.map(normalizeTab);
  return defaults.map((d) => {
    const e = edits.find((t) => t.tabId === d.tabId);
    if (!e) return normalizeTab(d);
    const products = d.products.map((dp, i) => {
      const ep = e.products.find((p) => p.key === dp.key) ?? e.products[i];
      if (!ep) return normalizeTab(d).products[i] ?? dp;
      return {
        ...dp,
        ...ep,
        titleTr: ep.titleTr?.trim() || ep.title?.trim() || dp.titleTr,
        titleEn: ep.titleEn?.trim() || dp.titleEn,
        href: ep.href || dp.href,
        imageUrl: ep.imageUrl ?? dp.imageUrl,
        priceText: ep.priceText?.trim() || dp.priceText,
        hidden: ep.hidden ?? dp.hidden,
      };
    });
    return normalizeTab({
      ...d,
      labelTr: e.labelTr?.trim() || e.label?.trim() || d.labelTr,
      labelEn: e.labelEn?.trim() || d.labelEn,
      hidden: e.hidden ?? d.hidden,
      showPricing: e.showPricing ?? d.showPricing,
      visibleProductCount: e.visibleProductCount ?? d.visibleProductCount,
      products,
    });
  });
}
