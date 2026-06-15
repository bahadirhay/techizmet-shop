import { parseHTML } from "@/lib/linkedom-server";
import {
  applyRevealingTextStatic,
  injectRevealingStaticGuard,
  injectRevealingStaticStyles,
  stripBrokenSectionDisplayAttr,
  type ProductPageBottomSettings,
} from "@/lib/product-page-bottom";

function setSectionVisible(section: Element | null, visible: boolean) {
  if (!section) return;
  const el = section as HTMLElement;
  if (visible) {
    el.style.removeProperty("display");
    el.removeAttribute("data-kn-pdp-hidden");
    el.removeAttribute("hidden");
  } else {
    el.style.setProperty("display", "none", "important");
    el.setAttribute("data-kn-pdp-hidden", "1");
    el.setAttribute("hidden", "");
  }
}

function serializeMirrorHtml(html: string, document: Document): string {
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}

/** Sunucu — animasyonlu metin: reveal-text yerine her zaman görünür statik metin */
export function injectRevealingTextMirrorHtml(
  html: string,
  config: { enabled: boolean; html: string },
): string {
  const out = stripBrokenSectionDisplayAttr(html);
  if (!out.includes("section-revealing-text")) return out;

  const { document } = parseHTML(out);
  injectRevealingStaticStyles(document);

  const section =
    document.querySelector("#MainContent .section-revealing-text") ??
    document.querySelector(".section-revealing-text");

  if (!section) return serializeMirrorHtml(out, document);

  if (!config.enabled) {
    setSectionVisible(section, false);
    document.getElementById("kn-revealing-static-guard")?.remove();
    return serializeMirrorHtml(out, document);
  }

  setSectionVisible(section, true);
  const existingPlain =
    section.querySelector(".revealing-text--content")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const text = config.html || existingPlain;
  applyRevealingTextStatic(document, section, text);
  injectRevealingStaticGuard(document, text);

  return serializeMirrorHtml(out, document);
}

export function injectProductPageBottomMirrorHtml(
  html: string,
  config: ProductPageBottomSettings,
): string {
  let out = injectRevealingTextMirrorHtml(html, config.revealingText);

  if (!config.marquee.enabled) {
    out = out.replace(
      /(<section\b[^>]*\bsection-marquee\b[^>]*)(>)/i,
      `$1 data-kn-pdp-hidden="1" style="display:none!important"$2`,
    );
  } else if (config.marquee.html) {
    const marqueeInner = config.marquee.html;
    out = out.replace(/<p class="marquee-text[^"]*">[\s\S]*?<\/p>/gi, `<p class="marquee-text ">${marqueeInner}</p>`);
  }

  if (config.videoPromo.enabled) {
    if (config.videoPromo.headingHtml) {
      out = out.replace(
        /(<section\b[^>]*\bsection-video\b[^>]*>[\s\S]*?<div class="section--heading[^"]*">)[\s\S]*?(<\/div>)/i,
        `$1${config.videoPromo.headingHtml}$2`,
      );
    }
    if (config.videoPromo.descriptionHtml) {
      out = out.replace(
        /(<section\b[^>]*\bsection-video\b[^>]*>[\s\S]*?<div class="section--description[^"]*">)[\s\S]*?(<\/div>)/i,
        `$1${config.videoPromo.descriptionHtml}$2`,
      );
    }
  }

  if (!config.videoPromo.enabled) {
    out = out.replace(
      /(<section\b[^>]*\bsection-video\b[^>]*)(>)/i,
      `$1 data-kn-pdp-hidden="1" style="display:none!important"$2`,
    );
  }

  return out;
}
