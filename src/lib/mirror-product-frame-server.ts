import "server-only";

import { unstable_cache } from "next/cache";
import { STORE_PUBLIC_REVALIDATE_SEC, storeMirrorTag } from "@/lib/cache/store-cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import { loadMirrorProductCommerce } from "@/lib/mirror-product-commerce-server";
import type { VitrinProductDetail } from "@/lib/mirror-product-detail-sync";
import type { ProductContentOverlay } from "@/lib/mirror-product-overlay";
import type { ProductExploreLook } from "@/lib/product-explore-looks";
import { productHighlightsForPatch } from "@/lib/product-highlights";
import type { ProductPageBottomSettings } from "@/lib/product-page-bottom";
import { loadExploreOverlayProducts } from "@/lib/explore-overlay-products";
import { prisma } from "@/lib/prisma";
import {
  getProductPageBottomSettings,
  getSiteSettings,
  resolveProductExploreLooks,
} from "@/lib/site-settings";
import type { MirrorProductCommercePayload } from "@/lib/mirror-product-commerce";

export type MirrorProductFramePayload = {
  overlay: ProductContentOverlay;
  productFromAdmin: VitrinProductDetail;
  commerce: MirrorProductCommercePayload | null;
  exploreLooks: ProductExploreLook[];
  exploreProductsBySlug: Awaited<ReturnType<typeof loadExploreOverlayProducts>>;
  productPageBottom: ProductPageBottomSettings;
};

async function loadMirrorProductFramePayloadUncached(
  siteId: string,
  slug: string,
  locale: ShopLocale,
): Promise<MirrorProductFramePayload | null> {
  const settings = await getSiteSettings(siteId);
  const [product, commerce] = await Promise.all([
    prisma.storeProduct.findUnique({
      where: { siteId_slug: { siteId, slug } },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { sortOrder: "asc" } },
      },
    }),
    loadMirrorProductCommerce(siteId, slug, locale, settings.store?.texts, { skipSession: true }),
  ]);

  if (!product?.published) return null;

  const exploreLooks = await resolveProductExploreLooks(siteId, product.exploreLooksJson ?? null);
  const allSlugs = exploreLooks.flatMap((l) => l.productSlugs);
  const exploreProductsBySlug = await loadExploreOverlayProducts(siteId, allSlugs);

  return {
    overlay: {
      description: product.description,
      descriptionHtml: product.descriptionHtml,
      keyFeaturesHtml: product.keyFeaturesHtml,
      howToUseHtml: product.howToUseHtml,
    },
    productFromAdmin: {
      productId: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      imageUrl: product.imageUrl,
      images: product.images.map((image) => ({
        url: image.url,
        alt: image.alt,
        mediaType: image.mediaType === "video" ? "video" : "image",
      })),
      variantOptionName: product.variantOptionName,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        label: variant.label,
        stockQty: variant.stockQty,
        isDefault: variant.isDefault,
      })),
      highlights: productHighlightsForPatch(product.highlightsJson) ?? undefined,
    },
    commerce,
    exploreLooks,
    exploreProductsBySlug,
    productPageBottom: getProductPageBottomSettings(settings),
  };
}

/** Ürün mirror kabuğu — tek önbellekli paket (nav/footer iframe HTML’de) */
export function loadMirrorProductFramePayload(
  siteId: string,
  slug: string,
  locale: ShopLocale,
): Promise<MirrorProductFramePayload | null> {
  return unstable_cache(
    () => loadMirrorProductFramePayloadUncached(siteId, slug, locale),
    ["mirror-product-frame", siteId, slug, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeMirrorTag(siteId), `product:${slug}`],
    },
  )();
}
