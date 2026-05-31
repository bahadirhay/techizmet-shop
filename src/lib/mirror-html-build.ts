import "server-only";

import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { unstable_cache } from "next/cache";
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
import { STORE_PUBLIC_REVALIDATE_SEC, storeMirrorTag } from "@/lib/cache/store-cache";
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
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
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
import {
  getProductPageBottomSettings,
  injectProductPageBottomMirrorHtml,
} from "@/lib/product-page-bottom";
import { getSiteBranding, getSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { rewriteLegacyThemePaths } from "@/lib/store-theme";

export type MirrorHtmlBuildParams = {
  normalized: string;
  locale: ShopLocale;
  siteId: string;
  siteName: string;
  pageKey?: string;
  blogSlug?: string;
};

function isProductMirrorPath(normalized: string) {
  return /\/mirror\/products\/([^/]+)\.html$/i.test(normalized);
}

/** Oturum / sepet / ödeme — tam sayfa önbelleği yok */
export function isMirrorPathUncacheable(normalized: string, blogSlug?: string) {
  if (blogSlug?.trim()) return true;
  if (normalized.includes("mirror/cart/")) return true;
  if (normalized.includes("mirror/checkout/")) return true;
  if (normalized.includes("mirror/account/")) return true;
  return false;
}

async function buildMirrorHtmlCore(params: MirrorHtmlBuildParams): Promise<string> {
  const { normalized, locale, siteId, siteName, pageKey, blogSlug } = params;
  const abs = join(process.cwd(), "public", normalized);
  let html = await readFile(abs, "utf8");

  const settings = await getSiteSettings(siteId);
  const branding = getSiteBranding(settings);

  html = stripShopifyTrackingFromMirrorHtml(html);
  html = rewriteShopifyLinksInMirrorHtml(html);
  html = patchMirrorPerformance(html);
  html = patchMirrorProductPageHtml(html);
  html = injectBrandingIntoMirrorHtml(fixMirrorCdnPathsInHtml(html), branding);
  let localized = localizeMirrorHtml(html, normalized, locale);

  const nav = await loadMirrorNavItems(siteId, locale);
  localized = injectNavIntoMirrorHtml(localized, nav, locale);
  localized = injectMirrorNavDropdownStyles(localized);

  if (locale === "tr") {
    const footer = await loadMirrorFooterData(siteId, locale);
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

  return rewriteLegacyThemePaths(localized);
}

function cacheKeyForMirror(params: MirrorHtmlBuildParams) {
  return [
    "mirror-html-v1",
    params.siteId,
    params.normalized,
    params.locale,
    params.pageKey ?? "",
  ] as const;
}

export function getCachedMirrorHtml(params: MirrorHtmlBuildParams): Promise<string> {
  const key = [...cacheKeyForMirror(params)];
  return unstable_cache(
    () => buildMirrorHtmlCore(params),
    key,
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeMirrorTag(params.siteId), `mirror-path:${params.normalized}`],
    },
  )();
}

export async function buildMirrorHtml(params: MirrorHtmlBuildParams): Promise<string> {
  if (isMirrorPathUncacheable(params.normalized, params.blogSlug)) {
    return buildMirrorHtmlCore(params);
  }
  return getCachedMirrorHtml(params);
}

export function productSlugFromMirrorPath(normalized: string): string | null {
  const m = normalized.match(/\/mirror\/products\/([^/]+)\.html$/i);
  if (!m) return null;
  return m[1].replace(/-tr$/i, "");
}

export async function injectProductCommerceIntoMirrorHtml(
  html: string,
  siteId: string,
  normalized: string,
  locale: ShopLocale,
  settings: SiteSettings,
): Promise<string> {
  const slug = productSlugFromMirrorPath(normalized);
  if (!slug) return html;
  const { loadMirrorProductCommerce } = await import("@/lib/mirror-product-commerce-server");
  const { injectMirrorProductCommerceHtml } = await import("@/lib/mirror-product-commerce");
  const commerce = await loadMirrorProductCommerce(siteId, slug, locale, settings.store?.texts);
  if (!commerce) return html;
  return injectMirrorProductCommerceHtml(html, commerce);
}
