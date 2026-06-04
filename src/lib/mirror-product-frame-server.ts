import "server-only";

import { unstable_cache } from "next/cache";
import { STORE_PUBLIC_REVALIDATE_SEC, storeMirrorTag } from "@/lib/cache/store-cache";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import { loadPublishedProductMirrorPatch } from "@/lib/mirror-product-detail-load";
import type { VitrinProductDetail } from "@/lib/mirror-product-detail-sync";
import type { ProductContentOverlay } from "@/lib/mirror-product-overlay";
import type { MirrorProductCommercePayload } from "@/lib/mirror-product-commerce";
import {
  getProductPageBottomSettings,
  type ProductPageBottomSettings,
} from "@/lib/product-page-bottom";

export type MirrorProductFramePayload = {
  overlay: ProductContentOverlay;
  productFromAdmin: VitrinProductDetail;
  commerce: MirrorProductCommercePayload | null;
  productPageBottom: ProductPageBottomSettings;
};

async function loadMirrorProductFramePayloadUncached(
  siteId: string,
  slug: string,
  locale: ShopLocale,
): Promise<MirrorProductFramePayload | null> {
  const settings = await getCachedParsedSiteSettings(siteId);
  const patch = await loadPublishedProductMirrorPatch(siteId, slug, locale, settings);
  if (!patch) return null;

  return {
    overlay: patch.overlay,
    productFromAdmin: patch.detail,
    commerce: patch.commerce,
    productPageBottom: getProductPageBottomSettings(settings, locale),
  };
}

/** Ürün mirror kabuğu — iframe HTML statik; explore istemcide yüklenir */
export function loadMirrorProductFramePayload(
  siteId: string,
  slug: string,
  locale: ShopLocale,
): Promise<MirrorProductFramePayload | null> {
  return unstable_cache(
    () => loadMirrorProductFramePayloadUncached(siteId, slug, locale),
    ["mirror-product-frame-v2", siteId, slug, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeMirrorTag(siteId), `product:${slug}`],
    },
  )();
}
