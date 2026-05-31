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

type AccordionSection = "description" | "features" | "howToUse";

function matchesAccordionHeading(text: string, section: AccordionSection): boolean {
  const t = text.trim().toLowerCase();
  if (section === "description") {
    return t === "description" || t === "açıklama" || t.startsWith("description");
  }
  if (section === "features") {
    return t.includes("key feature") || t.includes("öne çıkan") || t.includes("özellik");
  }
  return t.includes("how to use") || t.includes("nasıl kullan");
}

function patchAccordionSection(
  doc: Document,
  section: AccordionSection,
  raw: string | null | undefined,
  toHtml: (v: string) => string,
) {
  const html = raw?.trim() ? toHtml(raw) : "";

  doc.querySelectorAll(".product-accordion--heading-text").forEach((el) => {
    if (!matchesAccordionHeading(el.textContent ?? "", section)) return;
    const details = el.closest("details");
    if (!details) return;

    if (!html.trim()) {
      details.style.display = "none";
      details.removeAttribute("open");
      const body = details.querySelector(".product-accordion--content-body");
      if (body) body.innerHTML = "";
      return;
    }

    details.style.display = "";
    const body = details.querySelector(".product-accordion--content-body");
    if (body) body.innerHTML = html;
  });
}

/** Mirror PDP HTML içinde admin’den gelen metinleri uygular; boş alanlarda şablon içeriğini gizler. */
export function applyProductContentOverlay(doc: Document, overlay: ProductContentOverlay) {
  const short = overlay.description?.trim() ?? "";
  doc.querySelectorAll("#MainContent .product--description").forEach((el) => {
    el.textContent = short;
    const wrap = el.closest(".product--description-wrapper, .product--info-block");
    if (wrap instanceof HTMLElement) {
      wrap.style.display = short ? "" : "none";
    }
  });

  patchAccordionSection(doc, "description", overlay.descriptionHtml, contentForVitrinDescription);
  patchAccordionSection(doc, "features", overlay.keyFeaturesHtml, contentForVitrinAccordion);
  patchAccordionSection(doc, "howToUse", overlay.howToUseHtml, contentForVitrinAccordion);
}
