import "server-only";

import { unstable_cache } from "next/cache";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import { parseHTML } from "@/lib/linkedom-server";
import type { ShopLocale } from "@/lib/i18n/locale";
import { buildMirrorHtml } from "@/lib/mirror-html-build";
import { applyStreetFoodFundPageContent, streetFoodFundPageStyleTag } from "@/lib/mirror-street-food-fund-page";
import { vitrinMirrorFileRel, type VitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { buildStreetFoodFundPublicPayload } from "@/lib/street-food-fund/campaign";
import { listPublishedStreetFoodDonations } from "@/lib/street-food-fund/donations";

export type ThemeShellSectionsContent = {
  mainHtml: string;
  stylesheets: string[];
};

function fixRelativeLinks(html: string): string {
  return html
    .replace(/href="about\.html"/g, 'href="/pages/about"')
    .replace(/href="contact\.html"/g, 'href="/pages/contact"')
    .replace(/href="faq\.html"/g, 'href="/pages/faq"')
    .replace(/href="privacy-policy\.html"/g, 'href="/pages/privacy-policy"')
    .replace(/href="terms-of-service\.html"/g, 'href="/pages/terms-of-service"')
    .replace(/href="refund-policy\.html"/g, 'href="/pages/refund-policy"')
    .replace(/href="\.\.\/collections\/all\.html"/g, 'href="/collections/all"')
    .replace(/href="\/collections\/all\.html"/g, 'href="/collections/all"')
    .replace(/href="\.\.\/blogs\/news\.html"/g, 'href="/blogs/news"')
    .replace(/href="\/blogs\/news\.html"/g, 'href="/blogs/news"');
}

/** MainContent içindeki section'lardan stylesheet href'lerini toplar */
function extractStylesheetsFromMainHtml(mainHtml: string): string[] {
  const urls = new Set<string>();
  const re = /<link[^>]+href="([^"]+\.css[^"]*)"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mainHtml))) {
    const href = m[1]?.trim();
    if (href) urls.add(href);
  }
  return [...urls];
}

function extractMainContentInnerHtml(html: string): string | null {
  const { document } = parseHTML(html);
  const main = document.getElementById("MainContent");
  const inner = main?.innerHTML?.trim();
  return inner || null;
}

/** Overlay uygulanmış tam HTML → MainContent + section CSS */
export function buildThemeShellMainContentFromHtml(html: string): ThemeShellSectionsContent | null {
  const mainRaw = extractMainContentInnerHtml(html);
  if (!mainRaw) return null;

  const stylesheets = extractStylesheetsFromMainHtml(mainRaw);
  const mainHtml = fixRelativeLinks(mainRaw);
  if (!mainHtml.replace(/<[^>]+>/g, "").trim()) return null;

  return { mainHtml, stylesheets };
}

async function injectSokakDostlariLiveContent(
  siteId: string,
  locale: ShopLocale,
  mainHtml: string,
): Promise<string> {
  const [fund, donations] = await Promise.all([
    buildStreetFoodFundPublicPayload(siteId, locale),
    listPublishedStreetFoodDonations(siteId, locale === "en" ? "en" : "tr"),
  ]);
  const { document } = parseHTML(
    `<!DOCTYPE html><html><body><main id="MainContent">${mainHtml}</main></body></html>`,
  );
  applyStreetFoodFundPageContent(document, fund, donations, locale);
  const inner = document.getElementById("MainContent")?.innerHTML?.trim() ?? mainHtml;
  return `${streetFoodFundPageStyleTag()}${inner}`;
}

async function buildThemeShellSectionsContent(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  pageKey: VitrinPageKey,
  locale: ShopLocale,
): Promise<ThemeShellSectionsContent | null> {
  const normalized = vitrinMirrorFileRel(pageKey, locale);
  const html = await buildMirrorHtml({
    normalized,
    locale,
    siteId,
    siteName,
    tenantSlug,
    pageKey,
  });
  return buildThemeShellMainContentFromHtml(html);
}

function getCachedThemeShellSectionsContent(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  pageKey: VitrinPageKey,
  locale: ShopLocale,
): Promise<ThemeShellSectionsContent | null> {
  return unstable_cache(
    () => buildThemeShellSectionsContent(siteId, siteName, tenantSlug, pageKey, locale),
    ["theme-shell-sections-v2", siteId, tenantSlug, pageKey, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId), "store-products", "store-blog"],
    },
  )();
}

/** Vitrin pageKey + iframe ile aynı zengin HTML pipeline → MainContent bölümleri */
export async function resolveThemeShellSectionsContent(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  pageKey: VitrinPageKey,
  locale: ShopLocale,
): Promise<ThemeShellSectionsContent | null> {
  const sections = await getCachedThemeShellSectionsContent(
    siteId,
    siteName,
    tenantSlug,
    pageKey,
    locale,
  );
  if (!sections || pageKey !== "sokak-dostlari") return sections;

  const mainHtml = await injectSokakDostlariLiveContent(siteId, locale, sections.mainHtml);
  return { ...sections, mainHtml };
}
