import { plainTextToSimpleHtml } from "@/lib/html-plain-text";
import { isAnchorNode } from "@/lib/mirror-dom-node";

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

export type MediaGridItemEdit = MediaGridItemData;

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

function setItemImage(item: Element, url: string) {
  item.querySelectorAll("img.media_image, img").forEach((img) => {
    const el = img as HTMLImageElement;
    el.src = url;
    el.setAttribute("data-src", url);
    el.setAttribute("data-original", url);
    if (el.closest("noscript")) return;
  });
  const noscript = item.querySelector("noscript img");
  if (noscript) {
    (noscript as HTMLImageElement).src = url;
  }
}

/** Vitrin iframe — kayıtlı hero düzenlemeleri */
export function applyMediaGridItemsToSection(section: Element, edits: MediaGridItemEdit[]) {
  for (const edit of edits) {
    const item = section.querySelector(`#${CSS.escape(edit.itemId)}`);
    if (!item) continue;

    if (edit.imageUrl?.trim()) setItemImage(item, edit.imageUrl.trim());

    if (edit.headingHtml?.trim()) {
      const h = item.querySelector(".media-content-heading");
      if (h) h.innerHTML = edit.headingHtml.trim();
    }

    if (edit.descriptionHtml?.trim()) {
      const d = item.querySelector(".media-content-description");
      if (d) {
        const v = edit.descriptionHtml.trim();
        d.innerHTML = v.includes("<") ? v : plainTextToSimpleHtml(v);
      }
    }

    if (edit.buttonText?.trim()) {
      const label = item.querySelector(".button--text");
      if (label) label.textContent = edit.buttonText.trim();
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
