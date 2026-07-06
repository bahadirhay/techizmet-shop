import "server-only";

import { unstable_cache } from "next/cache";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import { parseHTML } from "@/lib/linkedom-server";
import { buildMirrorHtml } from "@/lib/mirror-html-build";
import { applyInstagramFeedToDoc } from "@/lib/mirror-instagram-feed";
import { vitrinMirrorFileRel } from "@/lib/mirror-vitrin-pages";
import { getStoreInstagramFeedPosts } from "@/lib/store-instagram-feed";
import {
  buildThemeShellMainContentFromHtml,
  type ThemeShellSectionsContent,
} from "@/lib/theme-shell-sections-content";
import {
  collectThemeShellVitrinScripts,
  type ThemeShellProductScript,
} from "@/lib/theme-shell-product-content";
import { mergeThemeShellVitrinEngineScripts } from "@/lib/theme-shell-vitrin-engine";
import { applyStreetFoodFundHero } from "@/lib/mirror-street-food-bar";
import { buildStreetFoodFundPublicPayload } from "@/lib/street-food-fund/campaign";

export type ThemeShellHomeContent = ThemeShellSectionsContent & {
  scripts: ThemeShellProductScript[];
};

async function buildThemeShellHomeContent(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  locale: ShopLocale,
): Promise<ThemeShellHomeContent | null> {
  const normalized = vitrinMirrorFileRel("home", locale);
  let html = await buildMirrorHtml({
    normalized,
    locale,
    siteId,
    siteName,
    tenantSlug,
    pageKey: "home",
  });

  const instagramPosts = await getStoreInstagramFeedPosts(siteId);
  if (instagramPosts.length) {
    const { document } = parseHTML(html);
    applyInstagramFeedToDoc(document, instagramPosts, "Instagram");
    const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
    html = `${doctype}\n${document.documentElement.outerHTML}`;
  }

  const fund = await buildStreetFoodFundPublicPayload(siteId, locale);
  if (fund?.enabled) {
    const { document } = parseHTML(html);
    applyStreetFoodFundHero(document, fund);
    const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
    html = `${doctype}\n${document.documentElement.outerHTML}`;
  }

  const sections = buildThemeShellMainContentFromHtml(html);
  if (!sections) return null;

  const { document } = parseHTML(html);
  const scripts = mergeThemeShellVitrinEngineScripts(collectThemeShellVitrinScripts(document));

  return { ...sections, scripts };
}

/** Ana sayfa — iframe ile aynı zengin HTML + vitrin scriptleri */
export function resolveThemeShellHomeContent(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  locale: ShopLocale,
): Promise<ThemeShellHomeContent | null> {
  return unstable_cache(
    () => buildThemeShellHomeContent(siteId, siteName, tenantSlug, locale),
    ["theme-shell-home-v11", siteId, tenantSlug, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId), "store-products"],
    },
  )();
}
