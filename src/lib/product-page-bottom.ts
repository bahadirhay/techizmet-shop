/** Ürün PDP alt bölümleri — marquee, keşfet, revealing text, video metin */

import type { ShopLocale } from "@/lib/i18n/locale";
import {
  htmlToPlainText,
  markedHtmlToPlainText,
  plainTextToMarkedHtml,
  plainTextToSimpleHtml,
} from "@/lib/html-plain-text";
import { applyMirrorTrReplacements } from "@/lib/mirror-html-locale";

export const DEFAULT_PRODUCT_MARQUEE_PLAIN_EN = "Up to *40% Off* Bestsellers";
export const DEFAULT_PRODUCT_MARQUEE_PLAIN_TR = "En çok satanlarda *%40'a varan* indirim";

export const DEFAULT_REVEALING_TEXT_PLAIN_EN =
  "Your skin works hard every day, and it deserves the highest quality care. Our products are thoughtfully crafted with premium ingredients to hydrate, protect, and enhance your natural glow.";

export const DEFAULT_REVEALING_TEXT_PLAIN_TR =
  "Cildiniz her gün yoğun çalışır ve en kaliteli bakımı hak eder. Ürünlerimiz premium içeriklerle nemlendirmek, korumak ve doğal ışıltınızı artırmak için özenle hazırlanmıştır.";

export const DEFAULT_VIDEO_HEADING_PLAIN_EN = "Your Skin Deserves the *Best*";
export const DEFAULT_VIDEO_HEADING_PLAIN_TR = "Cildiniz *En İyisini* Hak Ediyor";

export const DEFAULT_VIDEO_DESCRIPTION_PLAIN_EN =
  "Our skincare range is made with carefully selected, high-quality ingredients designed to nourish, protect, and enhance your natural beauty.";

export const DEFAULT_VIDEO_DESCRIPTION_PLAIN_TR =
  "Cilt bakım serimiz; cildinizi beslemek, korumak ve doğal güzelliğinizi öne çıkarmak için özenle seçilmiş yüksek kaliteli içeriklerle hazırlanmıştır.";

/** @deprecated vitrin — yalnızca EN şablon karşılaştırması */
export const DEFAULT_PRODUCT_MARQUEE_HTML = plainTextToMarkedHtml(DEFAULT_PRODUCT_MARQUEE_PLAIN_EN);

export const DEFAULT_REVEALING_TEXT_HTML = DEFAULT_REVEALING_TEXT_PLAIN_EN;

export const DEFAULT_VIDEO_HEADING_HTML = plainTextToMarkedHtml(DEFAULT_VIDEO_HEADING_PLAIN_EN);

export const DEFAULT_VIDEO_DESCRIPTION_HTML = plainTextToSimpleHtml(DEFAULT_VIDEO_DESCRIPTION_PLAIN_EN);

export function productMarqueePlainToHtml(plain: string): string {
  return plainTextToMarkedHtml(plain);
}

export function productVideoHeadingPlainToHtml(plain: string): string {
  return plainTextToMarkedHtml(plain);
}

export function productBodyPlainToHtml(plain: string): string {
  return plainTextToSimpleHtml(plain);
}

export function productMarqueeHtmlToPlain(html: string): string {
  return markedHtmlToPlainText(html);
}

export function productVideoHeadingHtmlToPlain(html: string): string {
  return markedHtmlToPlainText(html);
}

export function productBodyHtmlToPlain(html: string): string {
  return htmlToPlainText(html);
}

function localizeBottomHtml(html: string, locale: ShopLocale): string {
  if (locale !== "tr") return html;
  return applyMirrorTrReplacements(html);
}

function resolveStoredOrDefault(
  stored: string | undefined,
  plainEn: string,
  plainTr: string,
  toHtml: (plain: string) => string,
  locale: ShopLocale,
): string {
  const raw = stored?.trim();
  if (!raw) return localizeBottomHtml(toHtml(locale === "tr" ? plainTr : plainEn), locale);

  const plainFromStored = toHtml === plainTextToMarkedHtml ? markedHtmlToPlainText(raw) : htmlToPlainText(raw);
  const enHtml = toHtml(plainEn);
  const trHtml = toHtml(plainTr);

  if (locale === "tr") {
    if (raw === enHtml || plainFromStored === plainEn) return trHtml;
    if (raw === trHtml || plainFromStored === plainTr) return trHtml;
    return localizeBottomHtml(toHtml(plainFromStored || plainTr), locale);
  }

  if (raw === trHtml || plainFromStored === plainTr) return enHtml;
  return raw;
}

export type ProductPageBottomSettings = {
  marquee: { enabled: boolean; html: string };
  revealingText: { enabled: boolean; html: string };
  videoPromo: { enabled: boolean; headingHtml: string; descriptionHtml: string };
};

export type ProductPageBottomThemeConfig = {
  marquee?: Partial<ProductPageBottomSettings["marquee"]>;
  revealingText?: Partial<ProductPageBottomSettings["revealingText"]>;
  videoPromo?: Partial<ProductPageBottomSettings["videoPromo"]>;
};

type SettingsLike = {
  theme?: {
    defaultProductPageBottom?: ProductPageBottomThemeConfig;
    defaultProductMarqueeHtml?: string;
  };
};

export function getProductPageBottomSettings(
  settings: SettingsLike,
  locale: ShopLocale = "tr",
): ProductPageBottomSettings {
  const cfg = settings.theme?.defaultProductPageBottom;
  const legacyMarquee = settings.theme?.defaultProductMarqueeHtml?.trim();

  const marqueeStored = cfg?.marquee?.html?.trim() || legacyMarquee || undefined;

  return {
    marquee: {
      enabled: cfg?.marquee?.enabled ?? true,
      html: resolveStoredOrDefault(
        marqueeStored,
        DEFAULT_PRODUCT_MARQUEE_PLAIN_EN,
        DEFAULT_PRODUCT_MARQUEE_PLAIN_TR,
        plainTextToMarkedHtml,
        locale,
      ),
    },
    revealingText: {
      enabled: cfg?.revealingText?.enabled ?? true,
      html: resolveStoredOrDefault(
        cfg?.revealingText?.html?.trim(),
        DEFAULT_REVEALING_TEXT_PLAIN_EN,
        DEFAULT_REVEALING_TEXT_PLAIN_TR,
        plainTextToSimpleHtml,
        locale,
      ),
    },
    videoPromo: {
      enabled: cfg?.videoPromo?.enabled ?? true,
      headingHtml: resolveStoredOrDefault(
        cfg?.videoPromo?.headingHtml?.trim(),
        DEFAULT_VIDEO_HEADING_PLAIN_EN,
        DEFAULT_VIDEO_HEADING_PLAIN_TR,
        plainTextToMarkedHtml,
        locale,
      ),
      descriptionHtml: resolveStoredOrDefault(
        cfg?.videoPromo?.descriptionHtml?.trim(),
        DEFAULT_VIDEO_DESCRIPTION_PLAIN_EN,
        DEFAULT_VIDEO_DESCRIPTION_PLAIN_TR,
        plainTextToSimpleHtml,
        locale,
      ),
    },
  };
}

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

const REVEALING_STATIC_CSS = `<style id="kn-revealing-static-style">
#MainContent .section-revealing-text[data-kn-revealing-ready] reveal-text,
#MainContent .section-revealing-text[data-kn-revealing-ready] .revealing-text-line,
#MainContent .section-revealing-text[data-kn-revealing-ready] .revealing-text-char {
  display: none !important;
}
#MainContent .section-revealing-text[data-kn-revealing-ready] .background--overlay-image {
  z-index: 0 !important;
  pointer-events: none;
}
#MainContent .section-revealing-text[data-kn-revealing-ready] .container-fullwidth,
#MainContent .section-revealing-text[data-kn-revealing-ready] .revealing-text--wrapper {
  position: relative !important;
  z-index: 2 !important;
}
#MainContent .section-revealing-text[data-kn-revealing-ready] .kn-revealing-static {
  position: relative !important;
  z-index: 3 !important;
  display: block !important;
  width: 100%;
}
#MainContent .section-revealing-text[data-kn-revealing-ready] .kn-revealing-static-text {
  display: block !important;
  opacity: 1 !important;
  visibility: visible !important;
  color: rgb(var(--text_color, 0, 0, 0)) !important;
  background: none !important;
  -webkit-background-clip: unset !important;
  background-clip: unset !important;
  -webkit-text-fill-color: currentColor !important;
  max-width: 100%;
  margin: 0 auto;
  line-height: 1.35;
  font-size: clamp(1.25rem, 2.5vw, 2.25rem);
  text-align: center;
}
</style>`;

function injectRevealingStaticStyles(doc: Document) {
  if (doc.getElementById("kn-revealing-static-style")) return;
  const tpl = doc.createElement("template");
  tpl.innerHTML = REVEALING_STATIC_CSS;
  const style = tpl.content.firstElementChild;
  if (style) doc.head.appendChild(style);
}

/** Sunucu — mirror ürün HTML (reveal-text yüklenmeden önce) */
export function injectProductPageBottomMirrorHtml(
  html: string,
  config: ProductPageBottomSettings,
): string {
  let out = html;
  if (!out.includes("kn-revealing-static-style")) {
    out = out.replace(/<\/head>/i, `${REVEALING_STATIC_CSS}</head>`);
  }

  if (!config.revealingText.enabled) {
    out = out.replace(
      /(<section\b[^>]*\bsection-revealing-text\b[^>]*)(>)/i,
      `$1 data-kn-pdp-hidden="1" style="display:none!important"$2`,
    );
  } else {
    const text = config.revealingText.html;
    out = out.replace(
      /(<section\b[^>]*\bsection-revealing-text\b[^>]*)(>)([\s\S]*?)(<\/section>)/i,
      (_match, open, gt, body, close) => {
        let sectionBody = body;
        sectionBody = sectionBody.replace(/<reveal-text\b[^>]*>/gi, '<div class="kn-revealing-static">');
        sectionBody = sectionBody.replace(/<\/reveal-text>/gi, "</div>");
        sectionBody = sectionBody.replace(/\sdata-text-reveal\b(="[^"]*")?/gi, "");
        sectionBody = sectionBody.replace(
          /(<div class="revealing-text--wrapper[^>]*>)[\s\S]*?(<\/div>\s*\n\s*<\/div>)/i,
          `$1<div class="kn-revealing-static"><p class="kn-revealing-static-text heading-font h2">${text}</p></div>$2`,
        );
        return `${open} data-kn-revealing-ready="1"${gt}${sectionBody}${close}`;
      },
    );
  }

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

/** Tema reveal-text / SplitText animasyonunu kapat — düz okunabilir paragraf */
function applyRevealingTextStatic(doc: Document, section: Element, html: string) {
  section.setAttribute("data-kn-revealing-ready", "1");
  injectRevealingStaticStyles(doc);

  section.querySelectorAll(".revealing-text-line, .revealing-text-char, reveal-text").forEach((el) => {
    el.remove();
  });

  const wrapper = section.querySelector(".revealing-text--wrapper");
  if (wrapper) {
    wrapper.innerHTML = `<div class="kn-revealing-static"><p class="kn-revealing-static-text heading-font h2">${html}</p></div>`;
    return;
  }

  const existing = section.querySelector(".kn-revealing-static-text");
  if (existing instanceof HTMLElement) {
    existing.innerHTML = html;
  }
}

function injectRevealingStaticGuard(doc: Document, html: string) {
  const id = "kn-revealing-static-guard";
  doc.getElementById(id)?.remove();

  const script = doc.createElement("script");
  script.id = id;
  script.textContent = `(function(){
  var HTML = ${JSON.stringify(html)};
  function apply(){
    var section = document.querySelector("#MainContent .section-revealing-text");
    if (!section || section.getAttribute("data-kn-pdp-hidden")==="1") return;
    section.setAttribute("data-kn-revealing-ready", "1");
    section.querySelectorAll(".revealing-text-line, .revealing-text-char, reveal-text").forEach(function(n){ n.remove(); });
    var wrapper = section.querySelector(".revealing-text--wrapper");
    if (wrapper) {
      wrapper.innerHTML = '<div class="kn-revealing-static"><p class="kn-revealing-static-text heading-font h2">' + HTML + '</p></div>';
      return;
    }
    var existing = section.querySelector(".kn-revealing-static-text");
    if (existing) existing.innerHTML = HTML;
  }
  apply();
  setTimeout(apply, 100);
  setTimeout(apply, 600);
  setTimeout(apply, 2500);
})();`;
  (doc.body ?? doc.documentElement).appendChild(script);
}

/** Mirror iframe — ürün sayfası alt promo bölümleri */
export function applyProductPageBottomOverlay(doc: Document, config: ProductPageBottomSettings) {
  const main = doc.querySelector("#MainContent");
  if (!main) return;

  const marqueeSection = main.querySelector(".section-marquee");
  if (config.marquee.enabled) {
    setSectionVisible(marqueeSection, true);
    main.querySelectorAll(".section-marquee .marquee-text").forEach((el) => {
      el.innerHTML = config.marquee.html;
    });
  } else {
    setSectionVisible(marqueeSection, false);
  }

  const revealingSection = main.querySelector(".section-revealing-text");
  if (config.revealingText.enabled && revealingSection) {
    setSectionVisible(revealingSection, true);
    applyRevealingTextStatic(doc, revealingSection, config.revealingText.html);
    injectRevealingStaticGuard(doc, config.revealingText.html);
  } else {
    doc.getElementById("kn-revealing-static-guard")?.remove();
    revealingSection
      ?.querySelectorAll("reveal-text, .revealing-text-line, .revealing-text-char")
      .forEach((el) => el.remove());
    setSectionVisible(revealingSection, false);
  }

  const videoSection = main.querySelector(".section-video");
  if (config.videoPromo.enabled) {
    setSectionVisible(videoSection, true);
    const heading = videoSection?.querySelector(".section--heading");
    const desc = videoSection?.querySelector(".section--description");
    if (heading) heading.innerHTML = config.videoPromo.headingHtml;
    if (desc) desc.innerHTML = config.videoPromo.descriptionHtml;
  } else {
    videoSection?.querySelectorAll("video").forEach((v) => {
      try {
        (v as HTMLVideoElement).pause();
      } catch {
        /* ignore */
      }
    });
    setSectionVisible(videoSection, false);
  }

  doc.documentElement.setAttribute(
    "data-kn-pdp-bottom",
    JSON.stringify({
      marquee: config.marquee.enabled,
      revealing: config.revealingText.enabled,
      video: config.videoPromo.enabled,
    }),
  );

  injectProductPageBottomGuard(doc, config);
}

function injectProductPageBottomGuard(doc: Document, config: ProductPageBottomSettings) {
  const id = "kn-pdp-bottom-guard";
  doc.getElementById(id)?.remove();

  const script = doc.createElement("script");
  script.id = id;
  script.textContent = `(function(){
  var CFG = ${JSON.stringify(config)};
  function apply(){
    var main = document.querySelector("#MainContent");
    if (!main) return;
    var marquee = main.querySelector(".section-marquee");
    if (CFG.marquee && CFG.marquee.enabled) {
      if (marquee) {
        marquee.style.removeProperty("display");
        marquee.removeAttribute("data-kn-pdp-hidden");
        marquee.removeAttribute("hidden");
      }
      main.querySelectorAll(".section-marquee .marquee-text").forEach(function(el){
        if (CFG.marquee.html) el.innerHTML = CFG.marquee.html;
      });
    } else if (marquee) {
      marquee.style.setProperty("display", "none", "important");
      marquee.setAttribute("data-kn-pdp-hidden", "1");
    }
    var video = main.querySelector(".section-video");
    if (CFG.videoPromo && CFG.videoPromo.enabled) {
      if (video) {
        video.style.removeProperty("display");
        video.removeAttribute("data-kn-pdp-hidden");
        video.removeAttribute("hidden");
      }
      var heading = video && video.querySelector(".section--heading");
      var desc = video && video.querySelector(".section--description");
      if (heading && CFG.videoPromo.headingHtml) heading.innerHTML = CFG.videoPromo.headingHtml;
      if (desc && CFG.videoPromo.descriptionHtml) desc.innerHTML = CFG.videoPromo.descriptionHtml;
    } else if (video) {
      video.style.setProperty("display", "none", "important");
      video.setAttribute("data-kn-pdp-hidden", "1");
    }
  }
  apply();
  setTimeout(apply, 120);
  setTimeout(apply, 600);
  setTimeout(apply, 2000);
})();`;
  (doc.body ?? doc.documentElement).appendChild(script);
}
