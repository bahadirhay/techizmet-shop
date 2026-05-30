/** Koleksiyon şeridi — kaydırılan koleksiyon kartları */

import { isAnchorNode, isImageNode } from "@/lib/mirror-dom-node";
import type { ShopLocale } from "@/lib/i18n/locale";

export type ScrollingCollectionItemEdit = {
  cardId: string;
  titleTr: string;
  titleEn: string;
  href: string;
  imageUrl?: string;
  productCount?: string;
};

function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<section[^>]*__${esc}"[\\s\\S]*?</section>`, "i"))?.[0] ?? "";
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function extractScrollingCollectionsFromHtml(
  html: string,
  sectionKey: string,
): ScrollingCollectionItemEdit[] {
  const block = sliceSectionHtml(html, sectionKey);
  if (!block) return [];
  const items: ScrollingCollectionItemEdit[] = [];
  const idRe = /id="(scrollingCollectionItem-[^"]+)"/g;
  const ids: string[] = [];
  let idm: RegExpExecArray | null;
  while ((idm = idRe.exec(block))) ids.push(idm[1]);
  for (let i = 0; i < ids.length; i += 1) {
    const start = block.indexOf(`id="${ids[i]}"`);
    const end = i + 1 < ids.length ? block.indexOf(`id="${ids[i + 1]}"`) : block.length;
    const chunk = block.slice(start, end);
    const href = chunk.match(/href="([^"]+)"/i)?.[1]?.replace(/\.html$/i, "") ?? "";
    const imageUrl =
      chunk.match(/data-original="([^"]+)"/i)?.[1]?.split("?")[0] ??
      chunk.match(/\ssrc="(\/theme\/techizmet-shop\/[^"?]+)/i)?.[1];
    const title = stripHtml(
      chunk.match(/scrolling-collection--title[^>]*>\s*<span>([^<]*)</i)?.[1] ?? "",
    );
    const countM = chunk.match(/scrolling-collection--count[^>]*>\s*([^<]+)/i);
    if (!title && !href) continue;
    items.push({
      cardId: ids[i],
      href,
      imageUrl,
      titleTr: title,
      titleEn: title,
      productCount: countM ? stripHtml(countM[1]) : undefined,
    });
  }
  return items;
}

export function mergeScrollingCollectionEdits(
  defaults: ScrollingCollectionItemEdit[] | undefined,
  edits: ScrollingCollectionItemEdit[] | undefined,
): ScrollingCollectionItemEdit[] {
  if (!defaults?.length) return edits ?? [];
  if (!edits?.length) return defaults;
  return defaults.map((d, i) => {
    const e = edits.find((x) => x.cardId === d.cardId) ?? edits[i];
    if (!e) return d;
    return {
      ...d,
      titleTr: e.titleTr?.trim() || d.titleTr,
      titleEn: e.titleEn?.trim() || d.titleEn,
      href: e.href?.trim() || d.href,
      imageUrl: e.imageUrl ?? d.imageUrl,
      productCount: e.productCount ?? d.productCount,
    };
  });
}

function titleFor(item: ScrollingCollectionItemEdit, locale: ShopLocale) {
  return locale === "tr" ? item.titleTr || item.titleEn : item.titleEn || item.titleTr;
}

export function applyScrollingCollectionsToSection(
  sectionEl: Element,
  items: ScrollingCollectionItemEdit[],
  locale: ShopLocale = "tr",
) {
  for (const item of items) {
    const card = sectionEl.querySelector(`#${item.cardId}`);
    if (!card) continue;
    const title = titleFor(item, locale);
    const titleSpan = card.querySelector(".scrolling-collection--title span");
    if (titleSpan && title) titleSpan.textContent = title;
    if (item.href && isAnchorNode(card)) card.href = item.href;
    else {
      const link = card.closest("a") ?? card.querySelector("a");
      if (isAnchorNode(link) && item.href) link.href = item.href;
    }
    if (item.productCount) {
      const count = card.querySelector(".scrolling-collection--count");
      if (count) count.textContent = item.productCount;
    }
    if (item.imageUrl) {
      card.querySelectorAll("img").forEach((img) => {
        if (!isImageNode(img)) return;
        const url = item.imageUrl!.includes("?") ? item.imageUrl! : `${item.imageUrl}?kn=1`;
        img.src = url;
        img.setAttribute("data-original", item.imageUrl!);
        img.setAttribute("data-src", item.imageUrl!);
      });
    }
  }
}
