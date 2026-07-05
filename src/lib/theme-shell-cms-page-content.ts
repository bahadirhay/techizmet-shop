import "server-only";

import { unstable_cache } from "next/cache";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import { sanitizePublicHtml } from "@/lib/html-sanitize";
import { parseHTML } from "@/lib/linkedom-server";
import { buildMirrorHtml } from "@/lib/mirror-html-build";
import { vitrinMirrorFileRel } from "@/lib/mirror-vitrin-pages";

export type ThemeShellCmsPageContent = {
  bannerTitle: string;
  bodyHtml: string;
};

export function extractThemeShellCmsContentFromHtml(html: string): ThemeShellCmsPageContent | null {
  const { document } = parseHTML(html);
  const main = document.getElementById("MainContent");
  if (!main) return null;

  const cmsInner = main.querySelector(".kn-cms-page-inner");
  const bodyRaw = cmsInner?.innerHTML?.trim() ?? "";
  if (!bodyRaw) return null;

  const bannerTitle =
    main.querySelector(".page--title, h1.page--title, h2.page--title")?.textContent?.trim() ?? "";

  return {
    bannerTitle,
    bodyHtml: sanitizePublicHtml(bodyRaw),
  };
}

async function buildThemeShellCmsPageContent(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  slug: string,
  locale: ShopLocale,
): Promise<ThemeShellCmsPageContent | null> {
  const normalized = vitrinMirrorFileRel("about", locale);
  const html = await buildMirrorHtml({
    normalized,
    locale,
    siteId,
    siteName,
    tenantSlug,
    cmsSlug: slug,
  });
  return extractThemeShellCmsContentFromHtml(html);
}

/** CMS + mesafeli-satis — about kabuğu + admin içeriği */
export function resolveThemeShellCmsPageContent(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  slug: string,
  locale: ShopLocale,
): Promise<ThemeShellCmsPageContent | null> {
  return unstable_cache(
    () => buildThemeShellCmsPageContent(siteId, siteName, tenantSlug, slug, locale),
    ["theme-shell-cms-v1", siteId, tenantSlug, slug, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId)],
    },
  )();
}
