import { NextResponse } from "next/server";
import { getStoreLocale } from "@/lib/i18n/server";
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
import {
  buildMirrorHtml,
  injectProductCommerceIntoMirrorHtml,
  isMirrorPathUncacheable,
} from "@/lib/mirror-html-build";
import { getCustomerSession } from "@/lib/customer-session";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
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

  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const pageKeyParam = url.searchParams.get("pageKey")?.trim() ?? "";
  const blogSlug = url.searchParams.get("blogSlug")?.trim().replace(/\.html$/i, "") ?? "";

  let localized = await buildMirrorHtml({
    normalized,
    locale,
    siteId: site.id,
    siteName: site.name,
    pageKey: pageKeyParam || undefined,
    blogSlug: blogSlug || undefined,
  });

  const settings = await getSiteSettings(site.id);
  localized = await injectProductCommerceIntoMirrorHtml(
    localized,
    site.id,
    normalized,
    locale,
    settings,
  );

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
    const session = await getCustomerSession();
    if (session.isLoggedIn && session.customerId) {
      const payload = await loadMirrorAccountDashboardPayload(session.customerId, locale);
      if (payload) {
        localized = applyAccountDashboardToMirrorHtml(localized, payload);
      }
    }
  }

  const cacheable = !isMirrorPathUncacheable(normalized, blogSlug);
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
