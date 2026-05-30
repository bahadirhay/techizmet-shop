/** Shop the look — hotspot, hover önizleme, çekmece ürünleri */

import { isAnchorNode, isImageNode } from "@/lib/mirror-dom-node";
import type { ShopLocale } from "@/lib/i18n/locale";

export type ShopTheLookProductEdit = {
  key: string;
  href: string;
  title?: string;
  titleTr: string;
  titleEn: string;
  /** Çekmece / kart görseli */
  imageUrl?: string;
  /** Hotspot üzerine gelince görünen küçük önizleme */
  hoverImageUrl?: string;
};

export type ShopTheLookHotspotEdit = {
  hotspotId: string;
  drawerHeading?: string;
  drawerHeadingTr?: string;
  drawerHeadingEn?: string;
  drawerDesc?: string;
  drawerDescTr?: string;
  drawerDescEn?: string;
  products: ShopTheLookProductEdit[];
};

export type ShopTheLookSectionEdit = {
  mainImageUrl?: string;
  hotspots: ShopTheLookHotspotEdit[];
};

function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<section[^>]*__${esc}"[\\s\\S]*?</section>`, "i"))?.[0] ?? "";
}

function productKeyFromHref(href: string, index: number): string {
  const m = href.match(/\/products\/([^/?#]+)/i);
  return m?.[1] ?? `p-${index}`;
}

function extractHoverImages(hotspotChunk: string): string[] {
  const hoverBtn = hotspotChunk.match(
    /<button class="shop-the-look--dot-hover[\s\S]*?<\/button>/i,
  )?.[0];
  if (!hoverBtn) return [];
  const urls: string[] = [];
  const re = /shop-the-look--hover-image[\s\S]*?data-original="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(hoverBtn))) {
    urls.push(m[1].split("?")[0] ?? m[1]);
  }
  return urls;
}

function extractDrawerProducts(drawerBlock: string): ShopTheLookProductEdit[] {
  const products: ShopTheLookProductEdit[] = [];
  const cardRe = /<div class="horizontal--product-card[\s\S]*?(?=<div class="horizontal--product-card|$)/gi;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = cardRe.exec(drawerBlock))) {
    const chunk = m[0];
    const href = chunk.match(/href="(\/products\/[^"]+)"/i)?.[1];
    if (!href) continue;
    const title =
      chunk.match(/class="product--title"[^>]*>([\s\S]*?)<\/a>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ??
      "";
    const imageUrl =
      chunk.match(/data-original="([^"]+)"/i)?.[1] ??
      chunk.match(/\ssrc="(\/theme\/techizmet-shop\/[^"]+)"/i)?.[1];
    products.push({
      key: productKeyFromHref(href, i),
      href: href.trim(),
      title,
      titleTr: title,
      titleEn: title,
      imageUrl: imageUrl?.split("?")[0],
    });
    i += 1;
  }
  return products;
}

function extractHotspotsFromBlock(block: string): ShopTheLookHotspotEdit[] {
  const hotspots: ShopTheLookHotspotEdit[] = [];
  const hotspotRe = /<hot-spot[^>]*data-hotspot="(hot_spot_[^"]+)"[\s\S]*?<\/hot-spot>/gi;
  let m: RegExpExecArray | null;
  while ((m = hotspotRe.exec(block))) {
    const hotspotId = m[1];
    const chunk = m[0];
    const hoverImages = extractHoverImages(chunk);

    const drawerRe = new RegExp(
      `data-drawer="shop-the-look-drawer-${hotspotId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?(?=data-drawer="shop-the-look-drawer-|<\\/section>)`,
      "i",
    );
    const drawer = block.match(drawerRe)?.[0] ?? "";
    const drawerHeading = drawer
      .match(/class="shop-the-look--heading[^"]*"[^>]*>([\s\S]*?)<\/h5>/i)?.[1]
      ?.replace(/<[^>]+>/g, "")
      .trim();
    const drawerDesc = drawer
      .match(/class="shop-the-look--desc[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1]
      ?.replace(/<[^>]+>/g, "")
      .trim();

    const products = extractDrawerProducts(drawer).map((p, idx) => ({
      ...p,
      hoverImageUrl: hoverImages[idx] ?? hoverImages[0] ?? p.imageUrl,
    }));

    hotspots.push({
      hotspotId,
      drawerHeading,
      drawerHeadingTr: drawerHeading,
      drawerHeadingEn: drawerHeading,
      drawerDesc,
      drawerDescTr: drawerDesc,
      drawerDescEn: drawerDesc,
      products,
    });
  }
  return hotspots;
}

export function extractShopTheLookFromHtml(
  html: string,
  sectionKey: string,
): ShopTheLookSectionEdit {
  const block = sliceSectionHtml(html, sectionKey);
  if (!block) return { hotspots: [] };

  const mainImageUrl =
    block.match(/shop-the-look--image[^>]*>[\s\S]*?data-original="([^"]+)"/i)?.[1]?.split("?")[0];

  return { mainImageUrl, hotspots: extractHotspotsFromBlock(block) };
}

/** TR + EN HTML birleştirerek varsayılanlar (istemci güvenli) */
export function buildShopTheLookBilingualDefaults(
  trHtml: string,
  enHtml: string,
  sectionKey: string,
): ShopTheLookSectionEdit {
  const trBlock = sliceSectionHtml(trHtml, sectionKey);
  const enBlock = sliceSectionHtml(enHtml, sectionKey);
  const tr = extractHotspotsFromBlock(trBlock);
  const en = extractHotspotsFromBlock(enBlock);

  const mainImageUrl =
    trBlock.match(/shop-the-look--image[^>]*>[\s\S]*?data-original="([^"]+)"/i)?.[1]?.split("?")[0];

  const hotspots = tr.map((h, hi) => {
    const eh = en.find((x) => x.hotspotId === h.hotspotId) ?? en[hi];
    return {
      ...h,
      drawerHeadingTr: h.drawerHeadingTr ?? h.drawerHeading,
      drawerHeadingEn: eh?.drawerHeadingEn ?? eh?.drawerHeading ?? h.drawerHeading,
      drawerDescTr: h.drawerDescTr ?? h.drawerDesc,
      drawerDescEn: eh?.drawerDescEn ?? eh?.drawerDesc ?? h.drawerDesc,
      products: h.products.map((p, pi) => {
        const ep = eh?.products.find((x) => x.key === p.key) ?? eh?.products[pi];
        return {
          ...p,
          titleTr: p.titleTr || p.title || "",
          titleEn: ep?.titleEn || ep?.title || p.titleEn || p.titleTr,
          hoverImageUrl: p.hoverImageUrl ?? ep?.hoverImageUrl,
        };
      }),
    };
  });

  return { mainImageUrl, hotspots };
}

function pickText(tr: string | undefined, en: string | undefined, locale: ShopLocale, fallback?: string) {
  if (locale === "tr") return tr?.trim() || fallback || en?.trim() || "";
  return en?.trim() || fallback || tr?.trim() || "";
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

export function applyShopTheLookToSection(
  sectionEl: Element,
  data: ShopTheLookSectionEdit,
  locale: ShopLocale = "tr",
) {
  if (data.mainImageUrl?.trim()) {
    sectionEl.querySelectorAll(".shop-the-look--image img").forEach((img) => {
      if (isImageNode(img)) setImg(img.parentElement ?? img, data.mainImageUrl!);
    });
  }

  for (const hs of data.hotspots) {
    const hotspotEl = sectionEl.querySelector(`#hotspot-${hs.hotspotId}, [data-hotspot="${hs.hotspotId}"]`);
    if (hotspotEl) {
      const hoverImgs = hotspotEl.querySelectorAll(
        ".shop-the-look--dot-hover .shop-the-look--hover-image",
      );
      hs.products.forEach((p, idx) => {
        if (!p.hoverImageUrl) return;
        const wrap = hoverImgs[idx] ?? hoverImgs[0];
        if (wrap) setImg(wrap, p.hoverImageUrl);
      });
    }

    const drawer = sectionEl.querySelector(`[data-drawer="shop-the-look-drawer-${hs.hotspotId}"]`);
    if (!drawer) continue;
    const h = drawer.querySelector(".shop-the-look--heading");
    const heading = pickText(hs.drawerHeadingTr, hs.drawerHeadingEn, locale, hs.drawerHeading);
    if (h && heading) h.textContent = heading;
    const d = drawer.querySelector(".shop-the-look--desc");
    const desc = pickText(hs.drawerDescTr, hs.drawerDescEn, locale, hs.drawerDesc);
    if (d && desc) d.textContent = desc;

    const cards = drawer.querySelectorAll(".horizontal--product-card");
    hs.products.forEach((p, idx) => {
      const card = cards[idx];
      if (!card) return;
      card.querySelectorAll('a[href*="/products/"]').forEach((a) => {
        if (isAnchorNode(a) && p.href) a.href = p.href;
      });
      const title = card.querySelector(".product--title");
      const titleText = pickText(p.titleTr, p.titleEn, locale, p.title);
      if (title && titleText) title.textContent = titleText;
      if (p.imageUrl) {
        const wrap = card.querySelector(".horizontal--product-image");
        if (wrap) setImg(wrap, p.imageUrl);
      }
    });
  }
}

export function mergeShopTheLookEdits(
  defaults: ShopTheLookSectionEdit | undefined,
  edits: ShopTheLookSectionEdit | undefined,
): ShopTheLookSectionEdit {
  if (!defaults) return edits ?? { hotspots: [] };
  if (!edits) return defaults;
  const hotspots = defaults.hotspots.map((d) => {
    const e = edits.hotspots.find((h) => h.hotspotId === d.hotspotId);
    if (!e) return d;
    const products = d.products.map((dp, i) => {
      const ep = e.products.find((p) => p.key === dp.key) ?? e.products[i];
      if (!ep) return dp;
      return {
        ...dp,
        ...ep,
        titleTr: ep.titleTr?.trim() || ep.title?.trim() || dp.titleTr,
        titleEn: ep.titleEn?.trim() || dp.titleEn,
        hoverImageUrl: ep.hoverImageUrl ?? dp.hoverImageUrl,
        imageUrl: ep.imageUrl ?? dp.imageUrl,
        href: ep.href || dp.href,
      };
    });
    return {
      ...d,
      drawerHeadingTr: e.drawerHeadingTr?.trim() || e.drawerHeading?.trim() || d.drawerHeadingTr,
      drawerHeadingEn: e.drawerHeadingEn?.trim() || d.drawerHeadingEn,
      drawerDescTr: e.drawerDescTr?.trim() || e.drawerDesc?.trim() || d.drawerDescTr,
      drawerDescEn: e.drawerDescEn?.trim() || d.drawerDescEn,
      products,
    };
  });
  return {
    mainImageUrl: edits.mainImageUrl ?? defaults.mainImageUrl,
    hotspots,
  };
}
