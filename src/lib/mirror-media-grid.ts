import { plainTextToSimpleHtml } from "@/lib/html-plain-text";
import { isAnchorNode } from "@/lib/mirror-dom-node";
import {
  MIRROR_HERO_TILE_WIDTH,
  MIRROR_MOBILE_LCP_WIDTH,
  mirrorCdnImageUrl,
} from "@/lib/mirror-cdn-image";
import type { ShopLocale } from "@/lib/i18n/locale";

/** Media grid — sunucu (HTML parse) + istemci (DOM overlay) */

export type MediaGridItemData = {
  itemId: string;
  imageUrl?: string;
  headingHtml?: string;
  descriptionHtml?: string;
  /** Örn. EXPLORE ALL */
  buttonText?: string;
  linkHref?: string;
};

export type MediaGridItemEdit = MediaGridItemData & {
  /** EN vitrin için ayrı başlık (boşsa EN'de TR override uygulanmaz) */
  headingHtmlEn?: string;
  /** EN vitrin için ayrı açıklama */
  descriptionHtmlEn?: string;
  /** EN vitrin için ayrı buton yazısı */
  buttonTextEn?: string;
};

function mediaGridItemEl(section: Element, itemId: string): Element | null {
  const doc = section.ownerDocument;
  if (doc?.getElementById(itemId)) return doc.getElementById(itemId);
  const esc = itemId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return section.querySelector(`[id="${esc}"]`);
}

function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<section[^>]*__${esc}"[\\s\\S]*?</section>`,
    "i",
  );
  return html.match(re)?.[0] ?? "";
}

/** Mirror HTML’den hero kartlarını oku (admin varsayılanları) */
export function extractMediaGridItemsFromHtml(
  html: string,
  sectionKey: string,
): MediaGridItemData[] {
  const block = sliceSectionHtml(html, sectionKey);
  if (!block) return [];

  const items: MediaGridItemData[] = [];
  const idRe = /id="(media-grid-grid_[^"]+)"/g;
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(block))) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }

  for (const itemId of ids) {
    const esc = itemId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const itemRe = new RegExp(
      `<(?:a|div)[^>]*id="${esc}"[\\s\\S]*?(?=<(?:a|div)[^>]*id="media-grid-grid_|</div>\\s*</div>\\s*</div>\\s*</section>)`,
      "i",
    );
    const chunk = block.match(itemRe)?.[0] ?? "";

    const imageUrl =
      chunk.match(/data-original="([^"]+)"/i)?.[1] ??
      chunk.match(/\ssrc="(\/theme\/techizmet-shop\/[^"]+)"/i)?.[1];

    const headingHtml = chunk.match(
      /class="media-content-heading[^"]*"[^>]*>([\s\S]*?)<\/h[1-6]>/i,
    )?.[1];

    const descriptionHtml = chunk.match(
      /class="media-content-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    )?.[1];

    const linkHref =
      chunk.match(/<a[^>]*class="[^"]*button[^"]*"[^>]*href="([^"]+)"/i)?.[1] ??
      chunk.match(/^<a[^>]*href="([^"]+)"/im)?.[1];

    const buttonText = chunk.match(/class="button--text"[^>]*>([^<]*)</i)?.[1]?.trim();

    items.push({
      itemId,
      imageUrl: imageUrl?.trim(),
      headingHtml: headingHtml?.trim(),
      descriptionHtml: descriptionHtml?.trim(),
      buttonText: buttonText || undefined,
      linkHref: linkHref?.trim(),
    });
  }
  return items;
}

function setItemImage(item: Element, url: string, opts?: { isLcp?: boolean }) {
  const width = opts?.isLcp ? MIRROR_MOBILE_LCP_WIDTH : MIRROR_HERO_TILE_WIDTH;
  const sized = mirrorCdnImageUrl(url, width);
  const base = url.split("?")[0] ?? url;
  item.querySelectorAll("img.media_image, img").forEach((img) => {
    const el = img as HTMLImageElement;
    el.classList.remove("lazyload", "lazyloading", "lazyloaded");
    el.removeAttribute("lazyload");
    el.removeAttribute("srcset");
    el.removeAttribute("data-srcset");
    el.removeAttribute("sizes");
    el.removeAttribute("data-sizes");
    el.src = sized;
    el.setAttribute("data-src", sized);
    el.setAttribute("data-original", base);
    el.setAttribute("data-kn-sized", "1");
    const aspect = Number.parseFloat(el.getAttribute("data-aspectratio") ?? "");
    if (Number.isFinite(aspect) && aspect > 0) {
      const h = Math.max(1, Math.round(width / aspect));
      el.setAttribute("width", String(width));
      el.setAttribute("height", String(h));
    }
    if (opts?.isLcp) {
      el.setAttribute("fetchpriority", "high");
      el.setAttribute("loading", "eager");
      el.setAttribute("elementtiming", "kn-hero-lcp");
    } else {
      el.setAttribute("loading", "lazy");
      el.removeAttribute("fetchpriority");
    }
    if (el.closest("noscript")) return;
  });
  const noscript = item.querySelector("noscript img");
  if (noscript) {
    (noscript as HTMLImageElement).src = sized;
  }
}

/** Vitrin iframe — kayıtlı hero düzenlemeleri */
export function applyMediaGridItemsToSection(
  section: Element,
  edits: MediaGridItemEdit[],
  locale: ShopLocale = "tr",
) {
  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i]!;
    const item = mediaGridItemEl(section, edit.itemId);
    if (!item) continue;

    if (edit.imageUrl?.trim()) setItemImage(item, edit.imageUrl.trim(), { isLcp: i === 0 });

    // Başlık: EN'de headingHtmlEn varsa onu kullan; yoksa EN'de atla (TR override'ı gösterme)
    const effectiveHeading =
      locale === "en"
        ? edit.headingHtmlEn !== undefined
          ? edit.headingHtmlEn.trim() || null
          : null
        : edit.headingHtml?.trim() ?? null;
    if (effectiveHeading) {
      const h = item.querySelector(".media-content-heading");
      if (h) h.innerHTML = effectiveHeading;
    }

    // Açıklama
    const effectiveDesc =
      locale === "en"
        ? edit.descriptionHtmlEn !== undefined
          ? edit.descriptionHtmlEn.trim() || null
          : null
        : edit.descriptionHtml?.trim() ?? null;
    if (effectiveDesc) {
      const d = item.querySelector(".media-content-description");
      if (d) {
        d.innerHTML = effectiveDesc.includes("<") ? effectiveDesc : plainTextToSimpleHtml(effectiveDesc);
      }
    }

    // Buton yazısı
    const effectiveBtn =
      locale === "en"
        ? edit.buttonTextEn !== undefined
          ? edit.buttonTextEn.trim() || null
          : null
        : edit.buttonText?.trim() ?? null;
    if (effectiveBtn) {
      const label = item.querySelector(".button--text");
      if (label) label.textContent = effectiveBtn;
    }

    if (edit.linkHref?.trim()) {
      const href = edit.linkHref.trim();
      const link = isAnchorNode(item)
        ? item
        : item.querySelector("a.button, a[class*='button']");
      if (isAnchorNode(link)) link.href = href;
    }
  }
}
