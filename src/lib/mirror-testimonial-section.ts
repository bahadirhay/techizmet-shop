/** Müşteri yorumları — testimonial bölümü */

import { isImageNode } from "@/lib/mirror-dom-node";
import type { ShopLocale } from "@/lib/i18n/locale";

export type TestimonialItemEdit = {
  blockId: string;
  authorTr: string;
  authorEn: string;
  quoteTr: string;
  quoteEn: string;
  imageUrl?: string;
};

function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<section[^>]*__${esc}"[\\s\\S]*?</section>`, "i"))?.[0] ?? "";
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function extractTestimonialFromHtml(html: string, sectionKey: string): TestimonialItemEdit[] {
  const block = sliceSectionHtml(html, sectionKey);
  if (!block) return [];
  const items: TestimonialItemEdit[] = [];
  const itemRe =
    /<div class="testimonial--item[^"]*"[^>]*\bid="([^"]+)"([\s\S]*?)(?=<div class="testimonial--item|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(block))) {
    const chunk = m[2];
    const author = stripHtml(chunk.match(/class="author-title[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? "");
    const quote = stripHtml(chunk.match(/class="testimonial--desc[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "");
    const imageUrl =
      chunk.match(/data-original="([^"]+)"/i)?.[1]?.split("?")[0] ??
      chunk.match(/\ssrc="(\/theme\/king-noor\/[^"?]+)/i)?.[1];
    if (!author && !quote) continue;
    items.push({
      blockId: m[1],
      authorTr: author,
      authorEn: author,
      quoteTr: quote,
      quoteEn: quote,
      imageUrl,
    });
  }
  return items;
}

export function mergeTestimonialEdits(
  defaults: TestimonialItemEdit[] | undefined,
  edits: TestimonialItemEdit[] | undefined,
): TestimonialItemEdit[] {
  if (!defaults?.length) return edits ?? [];
  if (!edits?.length) return defaults;
  return defaults.map((d, i) => {
    const e = edits.find((x) => x.blockId === d.blockId) ?? edits[i];
    if (!e) return d;
    return {
      ...d,
      authorTr: e.authorTr?.trim() || d.authorTr,
      authorEn: e.authorEn?.trim() || d.authorEn,
      quoteTr: e.quoteTr?.trim() || d.quoteTr,
      quoteEn: e.quoteEn?.trim() || d.quoteEn,
      imageUrl: e.imageUrl ?? d.imageUrl,
    };
  });
}

function authorText(item: TestimonialItemEdit, locale: ShopLocale) {
  return locale === "tr" ? item.authorTr || item.authorEn : item.authorEn || item.authorTr;
}

function quoteText(item: TestimonialItemEdit, locale: ShopLocale) {
  return locale === "tr" ? item.quoteTr || item.quoteEn : item.quoteEn || item.quoteTr;
}

export function applyTestimonialToSection(
  sectionEl: Element,
  items: TestimonialItemEdit[],
  locale: ShopLocale = "tr",
) {
  for (const item of items) {
    const card = sectionEl.querySelector(`#${item.blockId}`);
    if (!card) continue;
    const authorEl = card.querySelector(".author-title");
    const quoteEl = card.querySelector(".testimonial--desc");
    const author = authorText(item, locale);
    const quote = quoteText(item, locale);
    if (authorEl && author) authorEl.textContent = author;
    if (quoteEl && quote) quoteEl.textContent = quote;
    if (item.imageUrl) {
      const img = card.querySelector("img");
      if (isImageNode(img)) {
        const url = item.imageUrl.includes("?") ? item.imageUrl : `${item.imageUrl}?kn=1`;
        img.src = url;
        img.setAttribute("data-original", item.imageUrl);
        img.setAttribute("data-src", item.imageUrl);
      }
    }
  }
}
