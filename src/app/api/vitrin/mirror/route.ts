import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { NextResponse } from "next/server";
import { getStoreLocale } from "@/lib/i18n/server";
import { injectBrandingIntoMirrorHtml } from "@/lib/mirror-html-branding";
import { injectFooterIntoMirrorHtml } from "@/lib/mirror-html-footer-inject";
import { patchMirrorHeaderIconsHtml } from "@/lib/mirror-html-header-fix";
import { fixMirrorCdnPathsInHtml } from "@/lib/mirror-cdn-assets";
import {
  patchMirrorFormAutocomplete,
  rewriteShopifyLinksInMirrorHtml,
  stripShopifyTrackingFromMirrorHtml,
} from "@/lib/mirror-html-shopify-strip";
import { injectMirrorSearchBridge } from "@/lib/mirror-search-bridge";
import { injectMirrorQuickviewBridge } from "@/lib/mirror-quickview-bridge";
import { localizeMirrorHtml } from "@/lib/mirror-html-locale";
import { patchMirrorSwiperHtml } from "@/lib/mirror-html-swiper-patch";
import { patchMirrorCriticalImageLoading } from "@/lib/mirror-html-image-loading";
import { injectMirrorAccountBridge } from "@/lib/mirror-account-bridge";
import { injectMirrorCartBridge } from "@/lib/mirror-cart-bridge";
import { injectMirrorStoreUiFix } from "@/lib/mirror-store-ui-fix";
import { injectMirrorIconsFix } from "@/lib/mirror-icons-fix";
import {
  getProductPageBottomSettings,
  injectProductPageBottomMirrorHtml,
} from "@/lib/product-page-bottom";
import { injectMirrorLinkBridge } from "@/lib/mirror-link-bridge";
import { injectMirrorNavDropdownStyles } from "@/lib/mirror-nav-dropdown-inject";
import { injectAccountDashboardStyles } from "@/lib/mirror-account-dashboard";
import { injectMirrorContentFallback } from "@/lib/mirror-html-content-fix";
import { patchMirrorPerformance } from "@/lib/mirror-html-perf";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { injectNavIntoMirrorHtml } from "@/lib/mirror-html-nav-inject";
import { injectMirrorProductCommerceHtml } from "@/lib/mirror-product-commerce";
import { loadMirrorProductCommerce } from "@/lib/mirror-product-commerce-server";
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
import {
  applyFeaturedBlogPostsToHtml,
  mergeFeaturedBlogIntoPageConfig,
} from "@/lib/mirror-featured-blog";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { applyMirrorPageOverlayToHtml } from "@/lib/mirror-page-overlay-server";
import { isVitrinPageKey } from "@/lib/mirror-vitrin-pages";
import {
  applyAccountDashboardToMirrorHtml,
  loadMirrorAccountDashboardPayload,
} from "@/lib/mirror-account-dashboard-server";
import { applyFavoritesPageToMirrorHtml } from "@/lib/mirror-favorites-page";
import { loadMirrorFavoritesPayload } from "@/lib/mirror-favorites-page-server";
import { applyCartPageToMirrorHtml } from "@/lib/mirror-cart-page";
import { loadMirrorCartPagePayload } from "@/lib/mirror-cart-page-server";
import { applyCheckoutPageToMirrorHtml } from "@/lib/mirror-checkout-page";
import {
  applyCheckoutSuccessToMirrorHtml,
  type MirrorCheckoutSuccessPayload,
} from "@/lib/mirror-checkout-success-page";
import { getCustomerSession } from "@/lib/customer-session";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

const ALLOWED_PREFIX = "theme/king-noor/mirror/";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rel = url.searchParams.get("path")?.trim();
  if (!rel || rel.includes("..")) {
    return NextResponse.json({ error: "Geçersiz path" }, { status: 400 });
  }

  const normalized = normalize(rel).replace(/\\/g, "/");
  if (!normalized.startsWith(ALLOWED_PREFIX) || !normalized.endsWith(".html")) {
    return NextResponse.json({ error: "Yalnızca mirror HTML" }, { status: 400 });
  }

  const abs = join(process.cwd(), "public", normalized);
  let html: string;
  try {
    html = await readFile(abs, "utf8");
  } catch {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const locale = await getStoreLocale();
  html = stripShopifyTrackingFromMirrorHtml(html);
  html = rewriteShopifyLinksInMirrorHtml(html);
  html = patchMirrorPerformance(html);
  const assetsFixed = fixMirrorCdnPathsInHtml(html);
  const branded = injectBrandingIntoMirrorHtml(assetsFixed, branding);
  let localized = localizeMirrorHtml(branded, normalized, locale);
  const nav = await loadMirrorNavItems(site.id, locale);
  localized = injectNavIntoMirrorHtml(localized, nav, locale);
  localized = injectMirrorNavDropdownStyles(localized);
  if (locale === "tr") {
    const footer = await loadMirrorFooterData(site.id, locale);
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

  const productSlugMatch = normalized.match(/\/mirror\/products\/([^/]+)\.html$/i);
  if (productSlugMatch) {
    const raw = productSlugMatch[1].replace(/-tr$/i, "");
    const commerce = await loadMirrorProductCommerce(site.id, raw, locale, settings.store?.texts);
    if (commerce) localized = injectMirrorProductCommerceHtml(localized, commerce);
    localized = injectProductPageBottomMirrorHtml(
      localized,
      getProductPageBottomSettings(settings),
    );
  }

  if (normalized.includes("mirror/cart/")) {
    const cartPayload = await loadMirrorCartPagePayload(locale);
    localized = applyCartPageToMirrorHtml(localized, cartPayload);
  }

  if (normalized.includes("mirror/checkout/success")) {
    const successPayload: MirrorCheckoutSuccessPayload = {
      locale,
      orderNumber: url.searchParams.get("order")?.trim() || undefined,
      accountCreated: url.searchParams.get("account") === "1",
      paid: url.searchParams.get("paid") !== "0",
      loggedIn: url.searchParams.get("loggedIn") === "1",
    };
    localized = applyCheckoutSuccessToMirrorHtml(localized, successPayload);
  } else if (normalized.includes("mirror/checkout/")) {
    localized = applyCheckoutPageToMirrorHtml(localized);
  }

  if (normalized.includes("mirror/account/favorites")) {
    const session = await getCustomerSession();
    if (session.isLoggedIn && session.customerId) {
      const favPayload = await loadMirrorFavoritesPayload(session.customerId, locale);
      localized = applyFavoritesPageToMirrorHtml(localized, favPayload);
    }
  } else if (normalized.match(/mirror\/account\/index(-tr)?\.html$/i)) {
    localized = injectAccountDashboardStyles(localized);
    const session = await getCustomerSession();
    if (session.isLoggedIn && session.customerId) {
      const payload = await loadMirrorAccountDashboardPayload(session.customerId, locale);
      if (payload) {
        localized = applyAccountDashboardToMirrorHtml(localized, payload);
      }
    }
  }

  const blogSlug = url.searchParams.get("blogSlug")?.trim().replace(/\.html$/i, "") ?? "";
  if (blogSlug && normalized.includes("/mirror/blogs/news/")) {
    const post = await getPublishedBlogPostBySlug(site.id, blogSlug);
    if (post) {
      localized = injectBlogArticleIntoHtml(localized, post, locale, site.name);
    }
  }

  if (normalized.includes("/mirror/blogs/news/index")) {
    const posts = await listPublishedBlogPosts(site.id);
    localized = applyBlogCardsToHtml(localized, blogPostsToListCards(posts, locale));
  }

  const isHomeMirror = /\/mirror\/index(-tr)?\.html$/i.test(normalized);
  let featuredForHome: Awaited<ReturnType<typeof listFeaturedBlogPostsForHome>> = [];
  if (isHomeMirror) {
    featuredForHome = await listFeaturedBlogPostsForHome(site.id, locale);
    if (featuredForHome.length) {
      localized = applyFeaturedBlogPostsToHtml(localized, featuredForHome, locale);
    }
  }

  const pageKeyParam = url.searchParams.get("pageKey")?.trim() ?? "";
  if (isVitrinPageKey(pageKeyParam)) {
    let pageConfig = getMirrorPageConfig(settings, pageKeyParam);
    if (pageKeyParam === "home" && featuredForHome.length) {
      pageConfig = mergeFeaturedBlogIntoPageConfig(pageConfig, featuredForHome);
    }
    localized = applyMirrorPageOverlayToHtml(localized, pageConfig, locale);
  }

  return new NextResponse(localized, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-cache, must-revalidate",
    },
  });
}
