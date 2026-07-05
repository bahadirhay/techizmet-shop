import { parseHTML } from "@/lib/linkedom-server";
import { enhanceMarqueeSection } from "@/lib/mirror-element-edits";
import { stripBrokenSectionDisplayAttr } from "@/lib/product-page-bottom";

/** Kayan şerit — autoplay + okunabilir boyut (ana sayfa şablonunda sınıf eksik olabilir) */
export function enhanceMarqueeSectionsInDocument(doc: Document): void {
  doc.querySelectorAll("section.section-marquee").forEach((section) => {
    enhanceMarqueeSection(section);
  });
}

export function enhanceMarqueeSectionsInHtml(html: string): string {
  if (!html.includes("section-marquee")) return html;
  const { document } = parseHTML(html);
  enhanceMarqueeSectionsInDocument(document);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return stripBrokenSectionDisplayAttr(`${doctype}\n${document.documentElement.outerHTML}`);
}
