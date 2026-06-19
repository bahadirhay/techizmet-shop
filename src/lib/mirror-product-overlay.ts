import {
  contentForVitrinAccordion,
  contentForVitrinDescription,
} from "@/lib/product-content-format";
import { isElementNode } from "@/lib/mirror-dom-node";

export type ProductContentOverlay = {
  description?: string | null;
  descriptionHtml?: string | null;
  keyFeaturesHtml?: string | null;
  howToUseHtml?: string | null;
  productBlogHtml?: string | null;
  productBlogTitle?: string | null;
  productBlogHref?: string | null;
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
    if (isElementNode(wrap)) {
      wrap.style.display = short ? "" : "none";
    }
  });

  patchAccordionSection(doc, "description", overlay.descriptionHtml, contentForVitrinDescription);
  patchAccordionSection(doc, "features", overlay.keyFeaturesHtml, contentForVitrinAccordion);
  patchAccordionSection(doc, "howToUse", overlay.howToUseHtml, contentForVitrinAccordion);
  patchProductBlogSection(doc, overlay);
}

function patchProductBlogSection(doc: Document, overlay: ProductContentOverlay) {
  const html = overlay.productBlogHtml?.trim() ?? "";
  const title = overlay.productBlogTitle?.trim() || "Detaylı bilgi";
  const href = overlay.productBlogHref?.trim() ?? "";
  const host = doc.querySelector("#MainContent .product-accordion");
  const existing = doc.getElementById("kn-product-blog-accordion");

  if (!html) {
    existing?.remove();
    return;
  }

  const linkHtml = href
    ? `<p><a href="${href.replace(/"/g, "&quot;")}" class="text-underline">Tam yazıyı oku</a></p>`
    : "";
  const body = `${html}${linkHtml}`;

  if (existing) {
    const heading = existing.querySelector(".product-accordion--heading-text");
    if (heading) heading.textContent = title;
    const bodyEl = existing.querySelector(".product-accordion--content-body");
    if (bodyEl) bodyEl.innerHTML = body;
    (existing as HTMLElement).style.display = "";
    return;
  }

  if (!host) return;
  host.insertAdjacentHTML(
    "beforeend",
    `<details class="product-accordion--item border-bottom" id="kn-product-blog-accordion" open>
      <summary class="product-accordion--heading detail-summary">
        <p class="product-accordion--heading-text h6">${title.replace(/</g, "&lt;")}</p>
        <span class="product-accordion--icon"></span>
      </summary>
      <div class="product-accordion--content" data-accordion-content>
        <div class="product-accordion--content-body rte">${body}</div>
      </div>
    </details>`,
  );
}
