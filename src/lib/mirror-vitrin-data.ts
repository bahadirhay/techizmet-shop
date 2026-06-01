import { unstable_cache } from "next/cache";
import { listFeaturedBlogPostsForHome } from "@/lib/blog/blog-posts-server";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  getCachedParsedSiteSettings,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import { mergeFeaturedBlogIntoPageConfig } from "@/lib/mirror-featured-blog";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import type { MirrorPageConfig } from "@/lib/mirror-home-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { VitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { getSiteBranding } from "@/lib/site-settings-branding";
import type { SiteSettings } from "@/lib/site-settings";
import { hasMirrorPageEdits } from "@/lib/mirror-home-overlay";
import { resolveMirrorCollectionTexts } from "@/lib/store-static-texts";
import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { ResolvedMirrorCollectionTexts } from "@/lib/store-static-texts";

export type MirrorVitrinHydration = {
  pageConfig?: MirrorPageConfig;
  branding?: MirrorBranding;
  mirrorTexts?: ResolvedMirrorCollectionTexts;
};

export function getMirrorVitrinHydration(
  siteId: string,
  pageKey: VitrinPageKey,
  locale: ShopLocale,
): Promise<MirrorVitrinHydration> {
  return unstable_cache(
    async () => {
      const settings: SiteSettings = await getCachedParsedSiteSettings(siteId);
      let pageConfig = getMirrorPageConfig(settings, pageKey);
      if (pageKey === "home" && hasMirrorPageEdits(pageConfig)) {
        const featured = await listFeaturedBlogPostsForHome(siteId, locale);
        if (featured.length) pageConfig = mergeFeaturedBlogIntoPageConfig(pageConfig, featured);
      }
      const payload: MirrorVitrinHydration = {
        branding: getSiteBranding(settings),
        mirrorTexts: resolveMirrorCollectionTexts(locale, settings.store?.texts),
      };
      if (hasMirrorPageEdits(pageConfig)) payload.pageConfig = pageConfig;
      return payload;
    },
    ["mirror-vitrin-hydration", siteId, pageKey, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId)],
    },
  )();
}
