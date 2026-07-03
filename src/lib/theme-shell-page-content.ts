import { parseHTML } from "@/lib/linkedom-server";
import type { ShopLocale } from "@/lib/i18n/locale";
import { sanitizePublicHtml } from "@/lib/html-sanitize";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { readMirrorPageHtmlForLocale } from "@/lib/mirror-page-html";
import { applyMirrorPageOverlayToHtml } from "@/lib/mirror-page-overlay-server";
import type { VitrinPageKey } from "@/lib/mirror-vitrin-pages";
import type { SiteSettings } from "@/lib/site-settings";

export type ThemeShellPageContent = {
  bannerTitle: string;
  bannerDescription?: string;
  bodyHtml: string;
};

function isSectionHidden(
  sectionKey: string,
  sections: ReturnType<typeof getMirrorPageConfig>["sections"],
): boolean {
  return sections[sectionKey]?.hidden === true;
}

export function extractThemeShellPageContentFromHtml(html: string): ThemeShellPageContent | null {
  const { document } = parseHTML(html);
  const main = document.getElementById("MainContent");
  if (!main) return null;

  const titleEl = main.querySelector(".page--title, h1.page--title, h2.page--title");
  const descEl = main.querySelector(".page--desc");
  const richtextEl = main.querySelector(".richtext--content");

  const bodyRaw = richtextEl?.innerHTML?.trim() ?? "";
  const bannerTitle = titleEl?.textContent?.trim() ?? "";
  if (!bannerTitle && !bodyRaw) return null;

  return {
    bannerTitle,
    bannerDescription: descEl?.textContent?.trim() || undefined,
    bodyHtml: bodyRaw ? sanitizePublicHtml(bodyRaw) : "",
  };
}

/** Vitrin pageConfig + mirror HTML → tema kabuğu sayfa içeriği */
export function resolveThemeShellPageContent(
  settings: SiteSettings,
  pageKey: VitrinPageKey,
  locale: ShopLocale,
): ThemeShellPageContent | null {
  const raw = readMirrorPageHtmlForLocale(pageKey, locale);
  if (!raw) return null;

  const config = getMirrorPageConfig(settings, pageKey);
  const overlaid = applyMirrorPageOverlayToHtml(raw, config, locale);

  if (isSectionHidden("page_banner", config.sections) && isSectionHidden("rich_text", config.sections)) {
    return null;
  }

  const content = extractThemeShellPageContentFromHtml(overlaid);
  if (!content) return null;

  if (isSectionHidden("page_banner", config.sections)) {
    content.bannerTitle = "";
    content.bannerDescription = undefined;
  }
  if (isSectionHidden("rich_text", config.sections)) {
    content.bodyHtml = "";
  }

  if (!content.bannerTitle && !content.bodyHtml) return null;
  return content;
}
