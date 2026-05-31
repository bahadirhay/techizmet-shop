import "server-only";

import { unstable_cache } from "next/cache";
import { STORE_PUBLIC_REVALIDATE_SEC, storeMirrorTag } from "@/lib/cache/store-cache";
import type { MirrorHtmlBuildParams } from "@/lib/mirror-html-processor";
import { buildMirrorHtmlCore } from "@/lib/mirror-html-processor";
import { readPrebuiltMirrorHtml } from "@/lib/mirror-prebuilt";
import type { SiteSettings } from "@/lib/site-settings";
import type { ShopLocale } from "@/lib/i18n/locale";
import { productSlugFromMirrorPath } from "@/lib/mirror-html-processor";

export type { MirrorHtmlBuildParams } from "@/lib/mirror-html-processor";
export {
  isProductMirrorPath,
  productSlugFromMirrorPath,
} from "@/lib/mirror-html-processor";

/** Oturum / sepet / ödeme — tam sayfa önbelleği yok */
export function isMirrorPathUncacheable(normalized: string, blogSlug?: string) {
  if (blogSlug?.trim()) return true;
  if (normalized.includes("mirror/cart/")) return true;
  if (normalized.includes("mirror/checkout/")) return true;
  if (normalized.includes("mirror/account/")) return true;
  return false;
}

function cacheKeyForMirror(params: MirrorHtmlBuildParams) {
  return [
    "mirror-html-v3",
    params.siteId,
    params.normalized,
    params.locale,
    params.pageKey ?? "",
  ] as const;
}

function getCachedMirrorHtml(params: MirrorHtmlBuildParams): Promise<string> {
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

  const prebuilt = await readPrebuiltMirrorHtml(params.normalized);
  if (prebuilt) return prebuilt;

  return getCachedMirrorHtml(params);
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
