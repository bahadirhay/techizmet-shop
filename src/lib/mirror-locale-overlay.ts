import type { ShopLocale } from "@/lib/i18n/locale";
import { applyMirrorTrReplacements } from "@/lib/mirror-html-locale";

/** innerHTML içinde görsel yolu varsa çeviri uygulama (Skincare→Cilt Bakımı kırılması) */
function hasAssetPath(html: string): boolean {
  return /\/(?:theme\/king-noor|uploads\/shop)\//.test(html);
}

/** Yalnızca düz metin — attribute / URL yok */
function applyTrPlainText(text: string): string {
  if (!text.trim() || hasAssetPath(text)) return text;
  return applyMirrorTrReplacements(text);
}

const TEXT_SELECTORS = [
  ".footer--text",
  ".footer--heading",
  ".footer--menu-heading",
  ".footer--menu-link",
  ".media-content-heading",
  ".media-content-description",
  ".revealing-text--content",
  ".section--heading",
  ".section--description",
  ".featured-blog--intro .section--heading",
  ".featured-blog--intro .section--description",
  ".blog--title",
  ".blog--desc",
  ".testimonial--desc",
  ".trending-products--title",
  ".trending-products--desc",
  ".product--title",
  ".product--card .text",
  "textPath",
  ".button--text",
  "[data-atc-text]",
  ".filter--columns-heading",
  ".serach--drawer-heading",
  ".page-banner h1",
  ".collection--heading",
  ".categories--text-inner",
  ".discover_data",
  ".marquee-text",
  ".marquee--text",
  ".marquee__text",
  ".image-with-text--heading",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p.text",
  "p.text-medium",
  "p.text-small",
  "p.text-large",
  "a.product--title",
  ".shop-the-look--desc",
  ".image-with-text--desc",
  ".richtext--content",
].join(",");

/** Kısa UI metinleri — looksEnglish atlanır, sözlükte varsa doğrudan uygula */
const FORCE_TR_SELECTORS = [
  ".categories--text-inner",
  ".discover_data",
  ".marquee-text",
  ".marquee--text",
  ".marquee__text",
  ".button--text",
  "span.markers-text",
].join(",");

function looksEnglish(text: string): boolean {
  const t = text.trim();
  if (t.length < 3) return false;
  if (!/[a-zA-Z]/.test(t)) return false;
  const enWords =
    /\b(the|and|with|your|for|our|skin|beauty|product|cream|serum|collection|natural|glow|hydrat|moistur|vitamin|ingredient|face|body|shop|view|detail|explore|customer|love|feedback|after|using|these|this|that|from|have|been|will|are|is|was|sale|flash|special|launch|cleans|toner|makeup|mask|gift|nourish|healthy|luxur|occasion|starts|offer|protect|restore|radiance|kindness|extra|code|off|all|now|fast|before|best|deals|end)\b/i;
  return enWords.test(t);
}

function applyTrToElement(el: Element) {
  if (el.closest("script, style, noscript, svg defs, .header--icons, list-set")) return;
  const tag = el.tagName.toLowerCase();
  if (tag === "textpath") {
    const t = el.textContent ?? "";
    const next = applyTrPlainText(t);
    if (next !== t) el.textContent = next;
    return;
  }
  const html = el.innerHTML;
  if (!html.trim() || hasAssetPath(html)) return;
  const next = applyMirrorTrReplacements(html);
  if (next !== html) el.innerHTML = next;
}

/** iframe içinde — sunucu çevirisinden sonra kalan metinler */
export function applyMirrorLocaleOverlay(doc: Document, locale: ShopLocale) {
  if (locale !== "tr") return;

  doc.querySelectorAll("[title], [aria-label]").forEach((el) => {
    for (const attr of ["title", "aria-label"] as const) {
      const val = el.getAttribute(attr);
      if (!val?.trim() || hasAssetPath(val)) continue;
      const next = applyTrPlainText(val);
      if (next !== val) el.setAttribute(attr, next);
    }
  });

  doc.querySelectorAll("img[alt], [alt]").forEach((el) => {
    const val = el.getAttribute("alt");
    if (!val?.trim() || val === "theking-noor") return;
    const next = applyTrPlainText(val);
    if (next !== val) el.setAttribute("alt", next);
  });

  doc.querySelectorAll(TEXT_SELECTORS).forEach((el) => {
    if (el.closest("script, style, noscript, svg defs, .header--icons, list-set")) return;
    const tag = el.tagName.toLowerCase();
    if (tag === "textpath") {
      const t = el.textContent ?? "";
      const next = applyMirrorTrReplacements(t);
      if (next !== t) el.textContent = next;
      return;
    }
    const html = el.innerHTML;
    if (!html.trim() || hasAssetPath(html) || (html.includes("<svg") && !html.includes("</"))) return;
    const plain = el.textContent?.trim() ?? "";
    if (!plain || !looksEnglish(plain)) {
      if (html && looksEnglish(html.replace(/<[^>]+>/g, " "))) {
        const next = applyMirrorTrReplacements(html);
        if (next !== html) el.innerHTML = next;
      }
      return;
    }
    const next = applyMirrorTrReplacements(html);
    if (next !== html) el.innerHTML = next;
  });

  doc.querySelectorAll(FORCE_TR_SELECTORS).forEach(applyTrToElement);

  doc.querySelectorAll("button-animate.button--hover-text").forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });

  doc.querySelectorAll("[data-text]").forEach((el) => {
    const d = el.getAttribute("data-text");
    if (!d) return;
    const next = applyMirrorTrReplacements(d);
    if (next !== d) el.setAttribute("data-text", next);
  });
}
