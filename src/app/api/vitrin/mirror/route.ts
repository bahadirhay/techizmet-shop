import { NextResponse } from "next/server";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import {
  applyAccountDashboardToMirrorHtml,
  loadMirrorAccountDashboardPayload,
} from "@/lib/mirror-account-dashboard-server";
import { applyFavoritesPageToMirrorHtml } from "@/lib/mirror-favorites-page";
import { loadMirrorFavoritesPayload } from "@/lib/mirror-favorites-page-server";
import { applyCartPageToMirrorHtml } from "@/lib/mirror-cart-page";
import { loadMirrorCartPagePayload } from "@/lib/mirror-cart-page-server";
import { applyCheckoutPageToMirrorHtml } from "@/lib/mirror-checkout-page";
import { applyOrderTrackPageToMirrorHtml } from "@/lib/mirror-order-track-page";
import { applyAccountAuthToMirrorHtml } from "@/lib/mirror-account-auth-page";
import {
  applyCheckoutSuccessToMirrorHtml,
  type MirrorCheckoutSuccessPayload,
} from "@/lib/mirror-checkout-success-page";
import {
  buildMirrorHtml,
  injectProductCommerceIntoMirrorHtml,
  isMirrorPathUncacheable,
} from "@/lib/mirror-html-build";
import { getCustomerSession } from "@/lib/customer-session";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { ensureStoreTenant } from "@/lib/store-tenant";
import { normalize } from "node:path";

const ALLOWED_PREFIX = "theme/techizmet-shop/mirror/";

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

  const tenant = await ensureStoreTenant();
  const site = await getDefaultSite();
  const locale = await getStoreLocaleFromHeaders();
  const pageKeyParam = url.searchParams.get("pageKey")?.trim() ?? "";
  const blogSlug = url.searchParams.get("blogSlug")?.trim().replace(/\.html$/i, "") ?? "";
  const productSlug = url.searchParams.get("productSlug")?.trim().replace(/\.html$/i, "") ?? "";
  const cmsSlug = url.searchParams.get("cmsSlug")?.trim() ?? "";
  const layoutOrderRaw = url.searchParams.get("layoutOrder")?.trim() ?? "";
  const layoutOrder = layoutOrderRaw
    ? layoutOrderRaw
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : undefined;

  let localized = await buildMirrorHtml({
    normalized,
    locale,
    siteId: site.id,
    siteName: site.name,
    tenantSlug: tenant.slug,
    pageKey: pageKeyParam || undefined,
    blogSlug: blogSlug || undefined,
    productSlug: productSlug || undefined,
    cmsSlug: cmsSlug || undefined,
    layoutOrder,
  });

  const isProductMirror = /\/mirror\/products\/([^/]+)\.html$/i.test(normalized);
  if (isProductMirror) {
    const settings = await getSiteSettings(site.id);
    localized = await injectProductCommerceIntoMirrorHtml(
      localized,
      site.id,
      normalized,
      locale,
      settings,
      productSlug || undefined,
    );
  }

  const session = await getCustomerSession();

  if (normalized.includes("mirror/cart/")) {
    const cartPayload = await loadMirrorCartPagePayload(locale);
    localized = applyCartPageToMirrorHtml(localized, cartPayload);
  }

  if (normalized.match(/mirror\/account\/login(-tr)?\.html$/i)) {
    localized = applyAccountAuthToMirrorHtml(localized, { locale, mode: "login" });
  } else if (normalized.match(/mirror\/account\/register(-tr)?\.html$/i)) {
    localized = applyAccountAuthToMirrorHtml(localized, { locale, mode: "register" });
  } else if (normalized.match(/mirror\/account\/forgot-password(-tr)?\.html$/i)) {
    localized = applyAccountAuthToMirrorHtml(localized, { locale, mode: "forgot-password" });
  } else if (normalized.includes("mirror/checkout/success")) {
    const successPayload: MirrorCheckoutSuccessPayload = {
      locale,
      orderNumber: url.searchParams.get("order")?.trim() || undefined,
      accountCreated: url.searchParams.get("account") === "1",
      paid: url.searchParams.get("paid") !== "0",
      loggedIn: url.searchParams.get("loggedIn") === "1",
      streetFoodContributionMessage: url.searchParams.get("fundMsg")?.trim() || undefined,
    };
    localized = applyCheckoutSuccessToMirrorHtml(localized, successPayload);
  } else if (normalized.includes("mirror/orders/")) {
    localized = applyOrderTrackPageToMirrorHtml(
      localized,
      url.searchParams.get("order")?.trim() || undefined,
    );
  } else if (normalized.includes("mirror/checkout/")) {
    localized = applyCheckoutPageToMirrorHtml(localized);
  }

  if (normalized.includes("mirror/account/favorites")) {
    if (session.isLoggedIn && session.customerId) {
      const favPayload = await loadMirrorFavoritesPayload(session.customerId, locale);
      localized = applyFavoritesPageToMirrorHtml(localized, favPayload);
    }
  } else if (normalized.match(/mirror\/account\/index(-tr)?\.html$/i)) {
    if (session.isLoggedIn && session.customerId) {
      const payload = await loadMirrorAccountDashboardPayload(session.customerId, locale);
      if (payload) {
        localized = applyAccountDashboardToMirrorHtml(localized, payload);
      }
    }
  }

  const cacheable = !isMirrorPathUncacheable(
    normalized,
    blogSlug,
    layoutOrder,
    productSlug,
    cmsSlug,
  );
  const cacheControl = cacheable
    ? "public, s-maxage=300, stale-while-revalidate=600"
    : "private, no-cache, must-revalidate";

  return new NextResponse(localized, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
}
