import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  applyBlogCardsToHtml,
  injectBlogArticleIntoHtml,
} from "@/lib/blog/mirror-blog-inject";
import {
  blogPostsToListCards,
  getPublishedBlogPostBySlug,
  listFeaturedBlogPostsForHome,
  listPublishedBlogPosts,
} from "@/lib/blog/blog-posts-server";
import type { ShopLocale } from "@/lib/i18n/locale";
import { fixMirrorCdnPathsInHtml } from "@/lib/mirror-cdn-assets";
import { injectAccountDashboardStyles } from "@/lib/mirror-account-dashboard";
import { injectMirrorAccountBridge } from "@/lib/mirror-account-bridge";
import { injectMirrorCartBridge } from "@/lib/mirror-cart-bridge";
import { injectMirrorContentFallback } from "@/lib/mirror-html-content-fix";
import { injectBrandingIntoMirrorHtml } from "@/lib/mirror-html-branding";
import { injectFooterIntoMirrorHtml } from "@/lib/mirror-html-footer-inject";
import { patchMirrorHeaderIconsHtml } from "@/lib/mirror-html-header-fix";
import { patchMirrorCriticalImageLoading } from "@/lib/mirror-html-image-loading";
import { localizeMirrorHtml } from "@/lib/mirror-html-locale";
import { patchMirrorPerformance } from "@/lib/mirror-html-perf";
import { patchMirrorProductPageHtml } from "@/lib/mirror-html-product-fix";
import {
  patchMirrorFormAutocomplete,
  rewriteShopifyLinksInMirrorHtml,
  stripShopifyTrackingFromMirrorHtml,
} from "@/lib/mirror-html-shopify-strip";
import { patchMirrorSwiperHtml } from "@/lib/mirror-html-swiper-patch";
import { injectNavIntoMirrorHtml } from "@/lib/mirror-html-nav-inject";
import { injectMirrorIconsFix } from "@/lib/mirror-icons-fix";
import { injectMirrorLinkBridge } from "@/lib/mirror-link-bridge";
import { injectMirrorNavDropdownStyles } from "@/lib/mirror-nav-dropdown-inject";
import { loadMirrorFooterDataUncached } from "@/lib/mirror-footer-load";
import { loadMirrorNavItemsUncached } from "@/lib/mirror-nav-load";
import {
  getProductPageBottomSettings,
  injectProductPageBottomMirrorHtml,
} from "@/lib/product-page-bottom";
import { injectPublishedProductIntoMirrorHtml } from "@/lib/mirror-product-detail-load";
import { injectMirrorQuickviewBridge } from "@/lib/mirror-quickview-bridge";
import { injectMirrorSearchBridge } from "@/lib/mirror-search-bridge";
import { injectMirrorStoreUiFix } from "@/lib/mirror-store-ui-fix";
import {
  applyFeaturedBlogPostsToHtml,
  mergeFeaturedBlogIntoPageConfig,
} from "@/lib/mirror-featured-blog";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { applyMirrorPageOverlayToHtml } from "@/lib/mirror-page-overlay-server";
import { isVitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { getSiteBranding } from "@/lib/site-settings-branding";
import { getSiteSettingsUncached } from "@/lib/site-settings-load";
import { rewriteLegacyThemePaths } from "@/lib/store-theme";
import {
  loadPublishedProductSlugSet,
  pruneMirrorHtmlToPublishedCatalog,
} from "@/lib/mirror-catalog-prune";

export type MirrorHtmlBuildParams = {
  normalized: string;
  locale: ShopLocale;
  siteId: string;
  siteName: string;
  pageKey?: string;
  blogSlug?: string;
};

export function isProductMirrorPath(normalized: string) {
  return /\/mirror\/products\/([^/]+)\.html$/i.test(normalized);
}

export function productSlugFromMirrorPath(normalized: string): string | null {
  const m = normalized.match(/\/mirror\/products\/([^/]+)\.html$/i);
  if (!m) return null;
  return m[1].replace(/-tr$/i, "");
}

/** Mirror HTML — disk okuma + veritabanı enjeksiyonları (derleme ve çalışma zamanı) */
export async function buildMirrorHtmlCore(params: MirrorHtmlBuildParams): Promise<string> {
  const { normalized, locale, siteId, siteName, pageKey, blogSlug } = params;
  const abs = join(process.cwd(), "public", normalized);
  let html = await readFile(abs, "utf8");

  const settings = await getSiteSettingsUncached(siteId);
  const branding = getSiteBranding(settings);

  html = stripShopifyTrackingFromMirrorHtml(html);
  html = rewriteShopifyLinksInMirrorHtml(html);
  html = patchMirrorPerformance(html);
  html = patchMirrorProductPageHtml(html);
  html = injectBrandingIntoMirrorHtml(fixMirrorCdnPathsInHtml(html), branding);
  let localized = localizeMirrorHtml(html, normalized, locale);

  const nav = await loadMirrorNavItemsUncached(siteId, locale);
  localized = injectNavIntoMirrorHtml(localized, nav, locale);
  localized = injectMirrorNavDropdownStyles(localized);

  if (locale === "tr") {
    const footer = await loadMirrorFooterDataUncached(siteId, locale);
    localized = injectFooterIntoMirrorHtml(localized, footer);
  }

  localized = patchMirrorHeaderIconsHtml(localized);
  localized = patchMirrorFormAutocomplete(localized);
  localized = patchMirrorCriticalImageLoading(localized);
  localized = patchMirrorSwiperHtml(localized);
  localized = injectMirrorContentFallback(localized);
  localized = injectMirrorAccountBridge(localized);
  localized = injectMirrorCartBridge(localized);
  localized = injectMirrorLinkBridge(localized);
  localized = injectMirrorSearchBridge(localized);
  localized = injectMirrorQuickviewBridge(localized);
  localized = injectMirrorStoreUiFix(localized);
  localized = injectMirrorIconsFix(localized);

  if (isProductMirrorPath(normalized)) {
    localized = injectProductPageBottomMirrorHtml(
      localized,
      getProductPageBottomSettings(settings),
    );
    const slug = productSlugFromMirrorPath(normalized);
    if (slug) {
      localized = await injectPublishedProductIntoMirrorHtml(
        localized,
        siteId,
        slug,
        locale,
        settings,
      );
    }
  }

  if (blogSlug?.trim() && normalized.includes("/mirror/blogs/news/")) {
    const post = await getPublishedBlogPostBySlug(siteId, blogSlug.trim());
    if (post) localized = injectBlogArticleIntoHtml(localized, post, locale, siteName);
  }

  if (normalized.includes("/mirror/blogs/news/index")) {
    const posts = await listPublishedBlogPosts(siteId);
    localized = applyBlogCardsToHtml(localized, blogPostsToListCards(posts, locale));
  }

  const isHomeMirror = /\/mirror\/index(-tr)?\.html$/i.test(normalized);
  let featuredForHome: Awaited<ReturnType<typeof listFeaturedBlogPostsForHome>> = [];
  if (isHomeMirror) {
    featuredForHome = await listFeaturedBlogPostsForHome(siteId, locale);
    if (featuredForHome.length) {
      localized = applyFeaturedBlogPostsToHtml(localized, featuredForHome, locale);
    }
  }

  if (pageKey && isVitrinPageKey(pageKey)) {
    let pageConfig = getMirrorPageConfig(settings, pageKey);
    if (pageKey === "home" && featuredForHome.length) {
      pageConfig = mergeFeaturedBlogIntoPageConfig(pageConfig, featuredForHome);
    }
    localized = applyMirrorPageOverlayToHtml(localized, pageConfig, locale);
  }

  if (normalized.match(/mirror\/account\/index(-tr)?\.html$/i)) {
    localized = injectAccountDashboardStyles(localized);
  }

  const publishedSlugs = await loadPublishedProductSlugSet(siteId);
  localized = pruneMirrorHtmlToPublishedCatalog(localized, publishedSlugs);

  return rewriteLegacyThemePaths(localized);
}
