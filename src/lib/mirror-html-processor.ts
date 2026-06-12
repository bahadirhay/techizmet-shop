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
import { applyAccountDrawerTrHtml } from "@/lib/mirror-account-drawer-locale";
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
  sanitizeLegacyStoreMirrorHtml,
} from "@/lib/mirror-html-shopify-strip";
import { patchMirrorSwiperHtml } from "@/lib/mirror-html-swiper-patch";
import { injectNavIntoMirrorHtml } from "@/lib/mirror-html-nav-inject";
import { injectMirrorIconsFix } from "@/lib/mirror-icons-fix";
import { injectMirrorListingCartBridge } from "@/lib/mirror-listing-cart-bridge";
import { injectMirrorProductFavoritesBridge } from "@/lib/mirror-product-favorites-bridge";
import { applyCmsPageToMirrorHtml } from "@/lib/mirror-cms-page";
import { parseBlocks } from "@/lib/blocks/schema";
import { buildDistanceSalesAgreementHtml } from "@/lib/legal/distance-sales-agreement";
import { resolveLegalSellerProfile } from "@/lib/legal/seller-profile";
import { injectMirrorAnalyticsBridge } from "@/lib/mirror-analytics-bridge";
import { injectMirrorLinkBridge } from "@/lib/mirror-link-bridge";
import { inferMirrorStorePath } from "@/lib/mirror-store-path";
import { injectMirrorNavDropdownStyles } from "@/lib/mirror-nav-dropdown-inject";
import { loadMirrorFooterDataUncached } from "@/lib/mirror-footer-load";
import { loadMirrorNavItemsUncached } from "@/lib/mirror-nav-load";
import {
  injectProductExploreMirrorHtml,
  isSiteDefaultExploreJson,
  parseExploreLooksJson,
  type ProductExploreLook,
} from "@/lib/product-explore-looks";
import {
  getProductPageBottomSettings,
  injectProductPageBottomCriticalCss,
  injectProductPageBottomMirrorHtml,
  injectRevealingTextMirrorHtml,
  injectSiteMarqueeMirrorHtml,
} from "@/lib/product-page-bottom";
import { injectPublishedProductIntoMirrorHtml } from "@/lib/mirror-product-detail-load";
import { injectMirrorQuickviewBridge } from "@/lib/mirror-quickview-bridge";
import { injectMirrorSearchBridge } from "@/lib/mirror-search-bridge";
import { injectMirrorStoreUiFix } from "@/lib/mirror-store-ui-fix";
import { injectMirrorLogoUnify } from "@/lib/mirror-logo-unify";
import { hasMarqueeElementOverride } from "@/lib/mirror-element-edits";
import {
  applyFeaturedBlogPostsToHtml,
  mergeFeaturedBlogIntoPageConfig,
} from "@/lib/mirror-featured-blog";
import { mergeLayoutOrderOverride } from "@/lib/mirror-home-overlay";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { enrichMirrorPageConfigCollectionsTabs } from "@/lib/mirror-collections-tab-server";
import { applyMirrorPageOverlayToHtml } from "@/lib/mirror-page-overlay-server";
import { isVitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { getSiteBranding } from "@/lib/site-settings-branding";
import { getSiteSettingsUncached } from "@/lib/site-settings-load";
import { rewriteLegacyThemePaths } from "@/lib/store-theme";
import {
  loadPublishedProductSlugSet,
  pruneMirrorHtmlToPublishedCatalog,
} from "@/lib/mirror-catalog-prune";
import {
  isCollectionMirrorPath,
  pruneCollectionSortOptionsHtml,
} from "@/lib/mirror-collection-sort-locale";
import { applyCollectionsCardsToMirrorHtml } from "@/lib/mirror-collections-sync-html";
import { injectHomeListingProductsIntoHtml } from "@/lib/mirror-home-products-inject-server";
import { syncMirrorListingPricesInHtml } from "@/lib/mirror-listing-prices-server";
import {
  getAnnouncementBarSettings,
  injectAnnouncementBarMirrorHtml,
} from "@/lib/mirror-announcement-bar";
import { prisma } from "@/lib/prisma";

export type MirrorHtmlBuildParams = {
  normalized: string;
  locale: ShopLocale;
  siteId: string;
  siteName: string;
  pageKey?: string;
  blogSlug?: string;
  /** Admin önizleme — anlık bölüm sırası (DB kaydından önce) */
  layoutOrder?: string[];
  /** Şablon dosyasından farklı ürün slug (prebuild) */
  productSlug?: string;
  /** CMS sayfa slug — about kabuğuna blok içeriği */
  cmsSlug?: string;
};

export function isProductMirrorPath(normalized: string) {
  return /\/mirror\/products\/([^/]+)\.html$/i.test(normalized);
}

export function productSlugFromMirrorPath(normalized: string): string | null {
  const m = normalized.match(/\/mirror\/products\/([^/]+)\.html$/i);
  if (!m) return null;
  return m[1].replace(/-tr$/i, "");
}

/** Settings nesnesinden explore looks çözer — React cache olmadan senkron */
function resolveExploreLooksSync(settings: { theme?: { defaultProductExploreLooks?: ProductExploreLook[] } }, json: string | null): ProductExploreLook[] {
  if (isSiteDefaultExploreJson(json)) {
    return settings.theme?.defaultProductExploreLooks ?? [];
  }
  const custom = parseExploreLooksJson(json);
  return custom ?? [];
}

/** Mirror HTML — disk okuma + veritabanı enjeksiyonları (derleme ve çalışma zamanı) */
export async function buildMirrorHtmlCore(params: MirrorHtmlBuildParams): Promise<string> {
  const { normalized, locale, siteId, siteName, pageKey, blogSlug, productSlug, layoutOrder, cmsSlug } =
    params;
  const abs = join(process.cwd(), "public", normalized);
  let html = await readFile(abs, "utf8");

  const settings = await getSiteSettingsUncached(siteId);
  const branding = getSiteBranding(settings);

  html = sanitizeLegacyStoreMirrorHtml(html);
  html = patchMirrorPerformance(html);
  html = patchMirrorProductPageHtml(html);
  html = injectBrandingIntoMirrorHtml(fixMirrorCdnPathsInHtml(html), branding);
  let localized = localizeMirrorHtml(html, normalized, locale);
  if (isCollectionMirrorPath(normalized)) {
    localized = pruneCollectionSortOptionsHtml(localized);
  }

  const nav = await loadMirrorNavItemsUncached(siteId, locale);
  localized = injectNavIntoMirrorHtml(localized, nav, locale);
  localized = injectMirrorNavDropdownStyles(localized);

  const footer = await loadMirrorFooterDataUncached(siteId, locale);
  localized = injectFooterIntoMirrorHtml(localized, footer);

  localized = patchMirrorHeaderIconsHtml(localized);
  localized = patchMirrorFormAutocomplete(localized);
  localized = patchMirrorCriticalImageLoading(localized);
  localized = patchMirrorSwiperHtml(localized);
  localized = injectMirrorContentFallback(localized);
  localized = injectMirrorAccountBridge(localized);
  if (locale === "tr") {
    localized = applyAccountDrawerTrHtml(localized);
  }
  localized = injectMirrorCartBridge(localized);
  localized = injectMirrorListingCartBridge(localized);
  localized = injectMirrorProductFavoritesBridge(localized);
  localized = injectMirrorLinkBridge(localized);
  localized = injectMirrorAnalyticsBridge(localized, inferMirrorStorePath(normalized));
  localized = injectMirrorSearchBridge(localized);
  localized = injectMirrorQuickviewBridge(localized);
  localized = injectMirrorStoreUiFix(localized);
  localized = injectMirrorLogoUnify(localized, branding);
  localized = injectMirrorIconsFix(localized);

  if (isProductMirrorPath(normalized)) {
    const bottomSettings = getProductPageBottomSettings(settings, locale);
    localized = injectProductPageBottomMirrorHtml(localized, bottomSettings);

    const fileSlug = productSlugFromMirrorPath(normalized);
    const slug = productSlug?.trim() || fileSlug;
    let hideExplore = false;

    if (slug) {
      try {
        const productRow = await prisma.storeProduct.findUnique({
          where: { siteId_slug: { siteId, slug } },
          select: { exploreLooksJson: true, published: true },
        });
        if (productRow?.published) {
          const exploreLooks = resolveExploreLooksSync(settings, productRow.exploreLooksJson ?? null);
          hideExplore = exploreLooks.length === 0;
          localized = injectProductExploreMirrorHtml(localized, exploreLooks);
        }
      } catch {
        // keşfet sorgusu başarısız — bölüm şablondan gelir, istemci overlay düzeltir
      }

      const templateSlug =
        fileSlug && slug && fileSlug.toLowerCase() !== slug.toLowerCase() ? fileSlug : undefined;
      localized = await injectPublishedProductIntoMirrorHtml(
        localized,
        siteId,
        slug,
        locale,
        settings,
        templateSlug,
      );
    }

    localized = injectProductPageBottomCriticalCss(localized, bottomSettings, hideExplore);
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
    const collections = await prisma.storeCollection.findMany({
      where: { siteId, published: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { slug: true, title: true, description: true, imageUrl: true, sortOrder: true },
    });
    if (collections.length) {
      localized = applyCollectionsCardsToMirrorHtml(localized, collections);
    }
    localized = await injectHomeListingProductsIntoHtml(localized, siteId, locale);
  }

  if (pageKey && isVitrinPageKey(pageKey)) {
    let pageConfig = getMirrorPageConfig(settings, pageKey);
    if (pageKey === "home" && featuredForHome.length) {
      pageConfig = mergeFeaturedBlogIntoPageConfig(pageConfig, featuredForHome);
    }
    const bottomSettings = getProductPageBottomSettings(settings, locale);
    localized = injectRevealingTextMirrorHtml(localized, bottomSettings.revealingText);
    if (
      !hasMarqueeElementOverride(pageConfig.elements) &&
      !Object.values(pageConfig.sections ?? {}).some((section) => Boolean(section?.marqueeHtml?.trim()))
    ) {
      localized = injectSiteMarqueeMirrorHtml(localized, bottomSettings.marquee);
    }
  }

  const publishedSlugs = await loadPublishedProductSlugSet(siteId);
  localized = pruneMirrorHtmlToPublishedCatalog(localized, publishedSlugs);

  if (pageKey && isVitrinPageKey(pageKey)) {
    let pageConfig = mergeLayoutOrderOverride(
      getMirrorPageConfig(settings, pageKey),
      layoutOrder,
    );
    if (pageKey === "home" && featuredForHome.length) {
      pageConfig = mergeFeaturedBlogIntoPageConfig(pageConfig, featuredForHome);
    }
    pageConfig = await enrichMirrorPageConfigCollectionsTabs(siteId, pageConfig);
    localized = applyMirrorPageOverlayToHtml(localized, pageConfig, locale);
  }

  if (normalized.match(/mirror\/account\/index(-tr)?\.html$/i)) {
    localized = injectAccountDashboardStyles(localized);
  }

  localized = injectAnnouncementBarMirrorHtml(
    localized,
    getAnnouncementBarSettings(settings, locale),
  );

  if (cmsSlug?.trim()) {
    const slug = cmsSlug.trim();
    if (slug === "mesafeli-satis") {
      const profile = resolveLegalSellerProfile(settings, { name: siteName });
      localized = applyCmsPageToMirrorHtml(localized, {
        title: "Mesafeli Satış Sözleşmesi",
        bodyHtml: buildDistanceSalesAgreementHtml(profile),
      });
    } else {
      const cmsPage = await prisma.shopPage.findUnique({
        where: { siteId_slug: { siteId, slug } },
      });
      if (cmsPage?.published) {
        localized = applyCmsPageToMirrorHtml(localized, {
          title: cmsPage.title,
          blocks: parseBlocks(cmsPage.blocks),
        });
      }
    }
  }

  localized = await syncMirrorListingPricesInHtml(localized, siteId);
  return rewriteLegacyThemePaths(localized);
}
