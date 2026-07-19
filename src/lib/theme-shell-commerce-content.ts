import "server-only";

import { unstable_cache } from "next/cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
} from "@/lib/cache/store-cache";
import { parseHTML } from "@/lib/linkedom-server";
import {
  applyCollectionDetailFromAdmin,
  applyCollectionProductsFromAdmin,
  type VitrinCollectionProductCard,
} from "@/lib/mirror-collections-sync";
import { applyCartPageToMirrorHtml } from "@/lib/mirror-cart-page";
import { loadMirrorCartPagePayload } from "@/lib/mirror-cart-page-server";
import { applyCheckoutPageToMirrorHtml } from "@/lib/mirror-checkout-page";
import {
  applyCheckoutSuccessToMirrorHtml,
  type MirrorCheckoutSuccessPayload,
} from "@/lib/mirror-checkout-success-page";
import {
  applyAccountAuthToMirrorHtml,
  type MirrorAccountAuthMode,
} from "@/lib/mirror-account-auth-page";
import {
  applyAccountDashboardToMirrorHtml,
  loadMirrorAccountDashboardPayload,
} from "@/lib/mirror-account-dashboard-server";
import { applyFavoritesPageToMirrorHtml } from "@/lib/mirror-favorites-page";
import { loadMirrorFavoritesPayload } from "@/lib/mirror-favorites-page-server";
import { applyOrderTrackPageToMirrorHtml } from "@/lib/mirror-order-track-page";
import { applySearchPageLayout } from "@/lib/mirror-search-page";
import { readMirrorHtmlRelForLocale } from "@/lib/mirror-page-html";
import {
  buildThemeShellMainContentFromHtml,
  type ThemeShellSectionsContent,
} from "@/lib/theme-shell-sections-content";
import { withProductDisplayTitle } from "@/lib/product-display-title";
import { prisma } from "@/lib/prisma";
import { imageUrlsFromProductRow, primaryImageUrlFromProductRow } from "@/lib/mirror-product-card-images";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

const MIRROR_CART_REL = "theme/techizmet-shop/mirror/cart/index.html";
const MIRROR_CHECKOUT_REL = "theme/techizmet-shop/mirror/checkout/index.html";
const MIRROR_CHECKOUT_SUCCESS_REL = "theme/techizmet-shop/mirror/checkout/success.html";
const MIRROR_ACCOUNT_LOGIN_REL = "theme/techizmet-shop/mirror/account/login.html";
const MIRROR_ACCOUNT_INDEX_REL = "theme/techizmet-shop/mirror/account/index.html";
const MIRROR_ACCOUNT_FAVORITES_REL = "theme/techizmet-shop/mirror/account/favorites.html";
const MIRROR_ORDER_TRACK_REL = "theme/techizmet-shop/mirror/orders/track.html";
const MIRROR_COLLECTIONS_ALL_REL = "theme/techizmet-shop/mirror/collections/all.html";

async function loadSearchProducts(siteId: string, term: string): Promise<VitrinCollectionProductCard[]> {
  const q = term.trim();
  if (q.length < 2) return [];

  const contains = { contains: q, mode: "insensitive" as const };
  const rows = await prisma.storeProduct.findMany({
    where: {
      siteId,
      ...storefrontListedWhere,
      OR: [
        { title: contains },
        { description: contains },
        { descriptionHtml: contains },
        { sku: contains },
        { slug: contains },
        { barcode: contains },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 48,
    select: {
      slug: true,
      title: true,
      imageUrl: true,
      priceMinor: true,
      compareAtMinor: true,
      stockQty: true,
      lowStockThreshold: true,
      badgesJson: true,
      weightGrams: true,
      pieceCount: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });

  return rows.map((p) => {
    const imageUrls = imageUrlsFromProductRow(p);
    return withProductDisplayTitle({
      ...p,
      imageUrl: primaryImageUrlFromProductRow(p),
      imageUrls: imageUrls.length > 1 ? imageUrls : undefined,
    });
  });
}

export async function resolveThemeShellCartContent(
  locale: ShopLocale,
): Promise<ThemeShellSectionsContent | null> {
  const raw = readMirrorHtmlRelForLocale(MIRROR_CART_REL, locale);
  if (!raw) return null;
  const payload = await loadMirrorCartPagePayload(locale);
  const html = applyCartPageToMirrorHtml(raw, payload);
  return buildThemeShellMainContentFromHtml(html);
}

export function resolveThemeShellCheckoutContent(
  siteId: string,
  locale: ShopLocale,
): Promise<ThemeShellSectionsContent | null> {
  return unstable_cache(
    () => {
      const raw = readMirrorHtmlRelForLocale(MIRROR_CHECKOUT_REL, locale);
      if (!raw) return Promise.resolve(null);
      const html = applyCheckoutPageToMirrorHtml(raw);
      return Promise.resolve(buildThemeShellMainContentFromHtml(html));
    },
    ["theme-shell-checkout-v1", siteId, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeMirrorTag(siteId)],
    },
  )();
}

function buildThemeShellAccountAuthContent(
  locale: ShopLocale,
  mode: MirrorAccountAuthMode,
): ThemeShellSectionsContent | null {
  const raw = readMirrorHtmlRelForLocale(MIRROR_ACCOUNT_LOGIN_REL, locale);
  if (!raw) return null;
  const html = applyAccountAuthToMirrorHtml(raw, { locale, mode });
  return buildThemeShellMainContentFromHtml(html);
}

export function resolveThemeShellAccountAuthContent(
  siteId: string,
  locale: ShopLocale,
  mode: MirrorAccountAuthMode,
): Promise<ThemeShellSectionsContent | null> {
  return unstable_cache(
    () => Promise.resolve(buildThemeShellAccountAuthContent(locale, mode)),
    ["theme-shell-account-auth-v1", siteId, locale, mode],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeMirrorTag(siteId)],
    },
  )();
}

export async function resolveThemeShellSearchContent(
  siteId: string,
  locale: ShopLocale,
  q: string,
): Promise<ThemeShellSectionsContent | null> {
  const raw = readMirrorHtmlRelForLocale(MIRROR_COLLECTIONS_ALL_REL, locale);
  if (!raw) return null;

  const term = q.trim();
  const isTr = locale === "tr";
  const products = await loadSearchProducts(siteId, term);
  const pageTitle =
    term.length >= 2
      ? isTr
        ? `Arama: ${term}`
        : `Search: ${term}`
      : isTr
        ? "Arama"
        : "Search";
  const pageDescription =
    term.length >= 2
      ? products.length
        ? isTr
          ? `${products.length} ürün bulundu`
          : `${products.length} products found`
        : isTr
          ? `"${term}" için sonuç bulunamadı`
          : `No results for "${term}"`
      : isTr
        ? "Aramak için en az 2 karakter girin."
        : "Enter at least 2 characters to search.";

  const { document } = parseHTML(raw);
  applyCollectionDetailFromAdmin(document, {
    title: pageTitle,
    description: pageDescription,
  });
  if (term.length >= 2) {
    applyCollectionProductsFromAdmin(document, products, locale);
  }
  applySearchPageLayout(document, {
    term,
    locale,
    resultCount: products.length,
  });

  const doctype = raw.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  const html = `${doctype}\n${document.documentElement.outerHTML}`;
  return buildThemeShellMainContentFromHtml(html);
}

export async function resolveThemeShellAccountDashboardContent(
  customerId: string,
  locale: ShopLocale,
): Promise<ThemeShellSectionsContent | null> {
  const raw = readMirrorHtmlRelForLocale(MIRROR_ACCOUNT_INDEX_REL, locale);
  if (!raw) return null;
  const payload = await loadMirrorAccountDashboardPayload(customerId, locale);
  if (!payload) return null;
  const html = applyAccountDashboardToMirrorHtml(raw, payload);
  return buildThemeShellMainContentFromHtml(html);
}

export async function resolveThemeShellFavoritesContent(
  customerId: string,
  locale: ShopLocale,
): Promise<ThemeShellSectionsContent | null> {
  const raw = readMirrorHtmlRelForLocale(MIRROR_ACCOUNT_FAVORITES_REL, locale);
  if (!raw) return null;
  const payload = await loadMirrorFavoritesPayload(customerId, locale);
  const html = applyFavoritesPageToMirrorHtml(raw, payload);
  return buildThemeShellMainContentFromHtml(html);
}

export function resolveThemeShellCheckoutSuccessContent(
  payload: MirrorCheckoutSuccessPayload,
): ThemeShellSectionsContent | null {
  const raw = readMirrorHtmlRelForLocale(MIRROR_CHECKOUT_SUCCESS_REL, payload.locale);
  if (!raw) return null;
  const html = applyCheckoutSuccessToMirrorHtml(raw, payload);
  return buildThemeShellMainContentFromHtml(html);
}

export function resolveThemeShellOrderTrackContent(
  locale: ShopLocale,
  orderNumber?: string,
): ThemeShellSectionsContent | null {
  const raw = readMirrorHtmlRelForLocale(MIRROR_ORDER_TRACK_REL, locale);
  if (!raw) return null;
  const html = applyOrderTrackPageToMirrorHtml(raw, orderNumber);
  return buildThemeShellMainContentFromHtml(html);
}
