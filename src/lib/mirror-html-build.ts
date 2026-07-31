import "server-only";

import { unstable_cache } from "next/cache";
import { STORE_PUBLIC_REVALIDATE_SEC, storeMirrorTag } from "@/lib/cache/store-cache";
import type { MirrorHtmlBuildParams } from "@/lib/mirror-html-processor";
import { buildMirrorHtmlCore } from "@/lib/mirror-html-processor";
import { readPrebuiltMirrorHtml } from "@/lib/mirror-prebuilt";
import { isMirrorDevLiveRebuild, preferPrebuiltMirrorHtml } from "@/lib/mirror-prebuilt";
import { injectMirrorListingCartBridge } from "@/lib/mirror-listing-cart-bridge";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { isVitrinPageKey } from "@/lib/mirror-vitrin-pages";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteSettingsUncached } from "@/lib/site-settings-load";
import type { ShopLocale } from "@/lib/i18n/locale";
import { productSlugFromMirrorPath } from "@/lib/mirror-html-processor";

import { LOGO_UNIFY_VERSION } from "@/lib/mirror-logo-unify";
import { mirrorPrebuildMatchesTenant } from "@/lib/mirror-prebuilt-tenant-shared";
import { getMirrorPrebuildTenantSlug } from "@/lib/mirror-prebuilt-tenant-server";
import { getActiveTenantSlug } from "@/lib/tenant-context";

const DEV_MIRROR_CACHE_TTL_MS = 120_000;
const DEV_MIRROR_CACHE_VERSION = `logo-unify-v${LOGO_UNIFY_VERSION}`;
const devMirrorHtmlCache = new Map<string, { html: string; at: number }>();

export function clearDevMirrorHtmlCache() {
  devMirrorHtmlCache.clear();
}

async function resolveLayoutOrderKey(params: MirrorHtmlBuildParams): Promise<string> {
  if (params.layoutOrder?.length) return `preview:${params.layoutOrder.join("|")}`;
  const pageKey = params.pageKey?.trim();
  if (!pageKey || !isVitrinPageKey(pageKey)) return "";
  const settings = await getSiteSettingsUncached(params.siteId);
  return getMirrorPageConfig(settings, pageKey).order.join("|");
}

function devMirrorCacheKey(params: MirrorHtmlBuildParams, layoutOrderKey: string): string {
  return [
    DEV_MIRROR_CACHE_VERSION,
    params.siteId,
    params.normalized,
    params.locale,
    params.pageKey ?? "",
    params.blogSlug ?? "",
    params.productSlug ?? "",
    params.cmsSlug ?? "",
    layoutOrderKey,
  ].join("\0");
}

async function buildMirrorHtmlDevCached(
  params: MirrorHtmlBuildParams,
  layoutOrderKey: string,
): Promise<string> {
  const key = devMirrorCacheKey(params, layoutOrderKey);
  const hit = devMirrorHtmlCache.get(key);
  if (hit && Date.now() - hit.at < DEV_MIRROR_CACHE_TTL_MS) return hit.html;
  const html = await buildMirrorHtmlCore(params);
  devMirrorHtmlCache.set(key, { html, at: Date.now() });
  return html;
}

export type { MirrorHtmlBuildParams } from "@/lib/mirror-html-processor";
export {
  isProductMirrorPath,
  productSlugFromMirrorPath,
} from "@/lib/mirror-html-processor";

/** Oturum / sepet / ödeme — tam sayfa önbelleği yok */
export function isMirrorPathUncacheable(
  normalized: string,
  blogSlug?: string,
  layoutOrder?: string[],
  productSlug?: string,
  cmsSlug?: string,
) {
  if (layoutOrder?.length) return true;
  if (blogSlug?.trim()) return true;
  if (cmsSlug?.trim()) return true;
  if (productSlug?.trim()) return true;
  if (normalized.includes("mirror/cart/")) return true;
  if (normalized.includes("mirror/checkout/")) return true;
  if (normalized.includes("mirror/orders/")) return true;
  if (normalized.includes("mirror/account/")) return true;
  return false;
}

function cacheKeyForMirror(params: MirrorHtmlBuildParams, layoutOrderKey: string) {
  return [
    "mirror-html-v13",
    params.tenantSlug ?? "",
    params.siteId,
    params.normalized,
    params.locale,
    params.pageKey ?? "",
    params.blogSlug ?? "",
    params.productSlug ?? "",
    params.cmsSlug ?? "",
    layoutOrderKey,
  ] as const;
}

function getCachedMirrorHtml(params: MirrorHtmlBuildParams, layoutOrderKey: string): Promise<string> {
  const key = [...cacheKeyForMirror(params, layoutOrderKey)];
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
  const layoutOrderKey = await resolveLayoutOrderKey(params);

  if (
    isMirrorPathUncacheable(
      params.normalized,
      params.blogSlug,
      params.layoutOrder,
      params.productSlug,
      params.cmsSlug,
    )
  ) {
    return isMirrorDevLiveRebuild()
      ? buildMirrorHtmlCore(params)
      : buildMirrorHtmlDevCached(params, layoutOrderKey);
  }

  // pageKey ile vitrin API — logo/hero/overlay enjeksiyonu için canlı HTML gerekir
  const usePrebuiltShell =
    !params.pageKey?.trim() && preferPrebuiltMirrorHtml(params.normalized);
  if (usePrebuiltShell) {
    const requestSlug = params.tenantSlug ?? getActiveTenantSlug();
    const prebuildSlug = await getMirrorPrebuildTenantSlug();
    if (
      requestSlug &&
      prebuildSlug &&
      mirrorPrebuildMatchesTenant(requestSlug, prebuildSlug)
    ) {
      const prebuilt = await readPrebuiltMirrorHtml(params.normalized);
      if (prebuilt) return injectMirrorListingCartBridge(prebuilt);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return getCachedMirrorHtml(params, layoutOrderKey);
  }

  return isMirrorDevLiveRebuild()
    ? buildMirrorHtmlCore(params)
    : buildMirrorHtmlDevCached(params, layoutOrderKey);
}

export async function injectProductCommerceIntoMirrorHtml(
  html: string,
  siteId: string,
  normalized: string,
  locale: ShopLocale,
  settings: SiteSettings,
  productSlug?: string,
): Promise<string> {
  const slug = productSlug?.trim() || productSlugFromMirrorPath(normalized);
  if (!slug) return html;
  const { loadMirrorProductCommerce } = await import("@/lib/mirror-product-commerce-server");
  const { injectMirrorProductCommerceHtml } = await import("@/lib/mirror-product-commerce");
  const commerce = await loadMirrorProductCommerce(siteId, slug, locale, settings.store?.texts);
  if (!commerce) return html;
  return injectMirrorProductCommerceHtml(html, commerce);
}
