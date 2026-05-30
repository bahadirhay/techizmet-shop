import {
  contentForVitrinAccordion,
  contentForVitrinDescription,
} from "@/lib/product-content-format";

export type ProductContentOverlay = {
  description?: string | null;
  descriptionHtml?: string | null;
  keyFeaturesHtml?: string | null;
  howToUseHtml?: string | null;
};

/** Mirror PDP HTML içinde admin’den gelen metinleri uygular (same-origin iframe). */
export function applyProductContentOverlay(doc: Document, overlay: ProductContentOverlay) {
  if (overlay.description) {
    const short = doc.querySelector(".product--description");
    if (short) short.textContent = overlay.description;
  }

  const sections: [string, string | null | undefined, (v: string) => string][] = [
    ["Description", overlay.descriptionHtml, contentForVitrinDescription],
    ["Key Features", overlay.keyFeaturesHtml, contentForVitrinAccordion],
    ["How to Use", overlay.howToUseHtml, contentForVitrinAccordion],
  ];

  for (const [heading, raw, toHtml] of sections) {
    const html = raw ? toHtml(raw) : "";
    if (!html.trim()) continue;
    doc.querySelectorAll(".product-accordion--heading-text").forEach((el) => {
      if (el.textContent?.trim() !== heading) return;
      const body = el.closest("details")?.querySelector(".product-accordion--content-body");
      if (body) body.innerHTML = html;
    });
  }
}
