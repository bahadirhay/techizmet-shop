import "server-only";

import { unstable_cache } from "next/cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { injectFooterIntoMirrorHtml } from "@/lib/mirror-html-footer-inject";
import { readMirrorPageHtmlForLocale } from "@/lib/mirror-page-html";

export type ThemeShellChrome = {
  announcementSlides: string[];
  announcementScheme?: string;
  footerHtml?: string;
  /** Mirror head içindeki renk şeması custom property tanımları */
  schemeCss?: string;
};

const NOOR_WHITE_LOGO = /\/theme\/techizmet-shop\/cdn\/shop\/files\/noor-white-logo34d3\.svg[^"'\s>]*/g;

/** Announcement + footer aynı tüm sayfalarda — sabit bir içerik sayfasından okunur */
const CHROME_SOURCE_PAGE = "privacy-policy" as const;

function extractAnnouncementSlides(html: string): { slides: string[]; scheme?: string } {
  const slideRe =
    /<div class="announcement-bar--item swiper-slide">\s*<p class="announcement-bar--text[^"]*">([\s\S]*?)<\/p>/g;
  const slides: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = slideRe.exec(html))) {
    const text = m[1]?.trim();
    if (text) slides.push(text);
  }
  const scheme = html.match(
    /announcement-bar--main section-wrapper (scheme-[\w-]+) section-solid/,
  )?.[1];
  return { slides, scheme };
}

/** Mirror head'indeki :root + .scheme-* renk değişkenlerini toplar (yüklü CSS'te yok) */
function extractSchemeCss(html: string): string {
  const rules: string[] = [];
  const rootRe = /:root\s*\{[^{}]*\}/g;
  let r: RegExpExecArray | null;
  while ((r = rootRe.exec(html))) {
    const block = r[0];
    if (
      block.includes("--body_background") ||
      block.includes("--text_color") ||
      block.includes("--footer_background") ||
      block.includes("--header_hover_color")
    ) {
      rules.push(block);
    }
  }
  const schemeRe = /\.scheme-[\w-]+\s*\{[^{}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = schemeRe.exec(html))) {
    rules.push(m[0]);
  }
  return rules.join("\n");
}

function extractFooterBlock(html: string): string | null {
  const start = html.indexOf("<footer");
  if (start < 0) return null;
  const endIdx = html.indexOf("</footer>", start);
  if (endIdx < 0) return null;
  return html.slice(start, endIdx + "</footer>".length);
}

function fixRelativeLinks(html: string): string {
  return html
    .replace(/href="about\.html"/g, 'href="/pages/about"')
    .replace(/href="contact\.html"/g, 'href="/pages/contact"')
    .replace(/href="faq\.html"/g, 'href="/pages/faq"')
    .replace(/href="\.\.\/blogs\/news\.html"/g, 'href="/blogs/news"')
    .replace(/href="\/blogs\/news\.html"/g, 'href="/blogs/news"');
}

function stripFooterLocaleSwitcher(html: string): string {
  return html.replace(
    /<div class="kn-iframe-locale[^>]*>[\s\S]*?<\/div>/,
    "",
  );
}

async function resolveThemeShellChromeUncached(
  siteId: string,
  locale: ShopLocale,
  footerLogoLight: string | null,
): Promise<ThemeShellChrome> {
  const html = readMirrorPageHtmlForLocale(CHROME_SOURCE_PAGE, locale);
  if (!html) return { announcementSlides: [] };

  const { slides, scheme } = extractAnnouncementSlides(html);
  const schemeCss = extractSchemeCss(html);

  let footerHtml: string | undefined;
  const footerBlock = extractFooterBlock(html);
  if (footerBlock) {
    const footerData = await loadMirrorFooterData(siteId, locale);
    let out = injectFooterIntoMirrorHtml(footerBlock, footerData);
    out = stripFooterLocaleSwitcher(out);
    out = fixRelativeLinks(out);
    if (footerLogoLight) {
      out = out.replace(NOOR_WHITE_LOGO, footerLogoLight);
    }
    footerHtml = out;
  }

  return {
    announcementSlides: slides,
    announcementScheme: scheme,
    footerHtml,
    schemeCss: schemeCss || undefined,
  };
}

export async function resolveThemeShellChrome(
  siteId: string,
  locale: ShopLocale,
  footerLogoLight: string | null,
): Promise<ThemeShellChrome> {
  return unstable_cache(
    () => resolveThemeShellChromeUncached(siteId, locale, footerLogoLight),
    ["theme-shell-chrome", siteId, locale, footerLogoLight ?? ""],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId)],
    },
  )();
}
