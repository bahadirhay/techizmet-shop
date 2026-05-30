/** Trend ürünler — sütun başına ürün kartı */

import { isAnchorNode, isImageNode } from "@/lib/mirror-dom-node";
import type { ShopLocale } from "@/lib/i18n/locale";

export type TrendingProductItemEdit = {
  columnId: string;
  titleTr: string;
  titleEn: string;
  descTr: string;
  descEn: string;
  href: string;
  priceText?: string;
  imageUrl?: string;
};

function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<section[^>]*__${esc}"[\\s\\S]*?</section>`, "i"))?.[0] ?? "";
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function extractTrendingProductsFromHtml(
  html: string,
  sectionKey: string,
): TrendingProductItemEdit[] {
  const block = sliceSectionHtml(html, sectionKey);
  if (!block) return [];
  const items: TrendingProductItemEdit[] = [];
  const colRe = /<trending-set[^>]*id="([^"]+)"[\s\S]*?<\/trending-set>/gi;
  let m: RegExpExecArray | null;
  while ((m = colRe.exec(block))) {
    const chunk = m[0];
    const columnId = m[1];
    const title = stripHtml(chunk.match(/class="trending-products--title[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? "");
    const desc = stripHtml(chunk.match(/class="trending-products--desc[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? "");
    const href =
      chunk.match(/class="trending-products--button"[^>]*href="([^"]+)"/i)?.[1]?.replace(/\.html$/i, "") ??
      chunk.match(/href="(\/products\/[^"]+)"/i)?.[1]?.replace(/\.html$/i, "") ??
      "";
    const priceText = stripHtml(chunk.match(/class="trending-products--price[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? "");
    const imageUrl =
      chunk.match(/data-original="([^"]+)"/i)?.[1]?.split("?")[0] ??
      chunk.match(/\ssrc="(\/theme\/king-noor\/[^"?]+)/i)?.[1];
    if (!title && !desc) continue;
    items.push({
      columnId,
      titleTr: title,
      titleEn: title,
      descTr: desc,
      descEn: desc,
      href,
      priceText: priceText || undefined,
      imageUrl,
    });
  }
  return items;
}

export function mergeTrendingProductEdits(
  defaults: TrendingProductItemEdit[] | undefined,
  edits: TrendingProductItemEdit[] | undefined,
): TrendingProductItemEdit[] {
  if (!defaults?.length) return edits ?? [];
  if (!edits?.length) return defaults;
  return defaults.map((d, i) => {
    const e = edits.find((x) => x.columnId === d.columnId) ?? edits[i];
    if (!e) return d;
    return {
      ...d,
      titleTr: e.titleTr !== undefined ? e.titleTr.trim() : d.titleTr,
      titleEn: e.titleEn !== undefined ? e.titleEn.trim() : d.titleEn,
      descTr: e.descTr !== undefined ? e.descTr.trim() : d.descTr,
      descEn: e.descEn !== undefined ? e.descEn.trim() : d.descEn,
      href: e.href !== undefined ? e.href.trim() : d.href,
      priceText: e.priceText !== undefined ? e.priceText : d.priceText,
      imageUrl: e.imageUrl !== undefined ? e.imageUrl : d.imageUrl,
    };
  });
}

function pickTr(tr: string, en: string) {
  return tr?.trim() || en?.trim() || "";
}

function pickEn(en: string, tr: string) {
  return en?.trim() || tr?.trim() || "";
}

function setImg(img: Element, url: string) {
  if (!isImageNode(img)) return;
  const bust = url.includes("?") ? `${url}&kn=1` : `${url}?kn=1`;
  img.src = bust;
  img.setAttribute("data-original", url);
  img.setAttribute("data-src", url);
  img.setAttribute("srcset", `${bust} 1x, ${bust} 2x`);
  img.removeAttribute("data-srcset");
}

export function applyTrendingProductsToSection(
  sectionEl: Element,
  items: TrendingProductItemEdit[],
  locale: ShopLocale = "tr",
) {
  for (const item of items) {
    const col = sectionEl.querySelector(`#${item.columnId}`);
    if (!col) continue;
    const titleEl = col.querySelector(".trending-products--title");
    const descEl = col.querySelector(".trending-products--desc");
    const priceEl = col.querySelector(".trending-products--price");
    const title = locale === "tr" ? pickTr(item.titleTr, item.titleEn) : pickEn(item.titleEn, item.titleTr);
    const desc = locale === "tr" ? pickTr(item.descTr, item.descEn) : pickEn(item.descEn, item.descTr);
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (priceEl) priceEl.textContent = item.priceText ?? "";
    const btn = col.querySelector("a.trending-products--button");
    if (isAnchorNode(btn) && item.href) btn.href = item.href;
    if (item.imageUrl) {
      col.querySelectorAll(".trending-products--image img, img").forEach((img) => {
        setImg(img, item.imageUrl!);
      });
    }
  }
}
