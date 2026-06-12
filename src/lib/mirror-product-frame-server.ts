import "server-only";

import { unstable_cache } from "next/cache";
import { STORE_PUBLIC_REVALIDATE_SEC, storeMirrorTag } from "@/lib/cache/store-cache";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import { loadExploreOverlayProducts } from "@/lib/explore-overlay-products";
import { loadPublishedProductMirrorPatch } from "@/lib/mirror-product-detail-load";
import type { VitrinProductDetail } from "@/lib/mirror-product-detail-sync";
import type { ProductContentOverlay } from "@/lib/mirror-product-overlay";
import type { MirrorProductCommercePayload } from "@/lib/mirror-product-commerce";
import type { ExploreOverlayProduct, ProductExploreLook } from "@/lib/product-explore-looks";
import {
  getProductPageBottomSettings,
  type ProductPageBottomSettings,
} from "@/lib/product-page-bottom";
import { resolveProductExploreLooks } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

export type MirrorProductFramePayload = {
  overlay: ProductContentOverlay;
  productFromAdmin: VitrinProductDetail;
  commerce: MirrorProductCommercePayload | null;
  productPageBottom: ProductPageBottomSettings;
  exploreLooks: ProductExploreLook[];
  exploreProductsBySlug: Record<string, ExploreOverlayProduct>;
};

async function loadMirrorProductFramePayloadUncached(
  siteId: string,
  slug: string,
  locale: ShopLocale,
): Promise<MirrorProductFramePayload | null> {
  const settings = await getCachedParsedSiteSettings(siteId);
  const patch = await loadPublishedProductMirrorPatch(siteId, slug, locale, settings);
  if (!patch) return null;

  const productRow = await prisma.storeProduct.findUnique({
    where: { siteId_slug: { siteId, slug } },
    select: { exploreLooksJson: true },
  });
  const exploreLooks = await resolveProductExploreLooks(siteId, productRow?.exploreLooksJson ?? null);
  const allSlugs = exploreLooks.flatMap((l) => l.productSlugs);
  const exploreProductsBySlug = await loadExploreOverlayProducts(siteId, allSlugs);

  return {
    overlay: patch.overlay,
    productFromAdmin: patch.detail,
    commerce: patch.commerce,
    productPageBottom: getProductPageBottomSettings(settings, locale),
    exploreLooks,
    exploreProductsBySlug,
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
    ["mirror-product-frame-v6", siteId, slug, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeMirrorTag(siteId), `product:${slug}`],
    },
  )();
}
