/** Ürün mirror — DB verisini HTML enjeksiyonuna hazırlar (prebuild + runtime) */

import { loadMirrorProductCommerceUncached } from "@/lib/mirror-product-commerce-load";
import type { MirrorProductCommercePayload } from "@/lib/mirror-product-commerce";
import {
  applyProductDetailToMirrorHtml,
  type VitrinProductDetail,
} from "@/lib/mirror-product-detail-sync";
import type { ProductContentOverlay } from "@/lib/mirror-product-overlay";
import { productHighlightsForPatch } from "@/lib/product-highlights";
import { getProductPageBottomSettings } from "@/lib/product-page-bottom";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { SiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

type DbProduct = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  descriptionHtml: string | null;
  keyFeaturesHtml: string | null;
  howToUseHtml: string | null;
  imageUrl: string | null;
  highlightsJson: string | null;
  variantOptionName: string | null;
  images: { url: string; alt: string | null; mediaType: string; sortOrder: number }[];
  variants: {
    id: string;
    label: string;
    stockQty: number;
    isDefault: boolean;
    sortOrder: number;
  }[];
};

export function vitrinProductDetailFromDb(product: DbProduct): VitrinProductDetail {
  return {
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
  };
}

export function productContentOverlayFromDb(product: DbProduct): ProductContentOverlay {
  return {
    description: product.description,
    descriptionHtml: product.descriptionHtml,
    keyFeaturesHtml: product.keyFeaturesHtml,
    howToUseHtml: product.howToUseHtml,
  };
}

export async function loadPublishedProductMirrorPatch(
  siteId: string,
  slug: string,
  locale: ShopLocale,
  settings: SiteSettings,
): Promise<{
  detail: VitrinProductDetail;
  overlay: ProductContentOverlay;
  commerce: MirrorProductCommercePayload | null;
} | null> {
  const product = await prisma.storeProduct.findUnique({
    where: { siteId_slug: { siteId, slug } },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product?.published) return null;

  const commerce = await loadMirrorProductCommerceUncached(
    siteId,
    slug,
    locale,
    settings.store?.texts,
    { skipSession: true },
  );

  return {
    detail: vitrinProductDetailFromDb(product),
    overlay: productContentOverlayFromDb(product),
    commerce,
  };
}

export async function injectPublishedProductIntoMirrorHtml(
  html: string,
  siteId: string,
  slug: string,
  locale: ShopLocale,
  settings: SiteSettings,
  templateSlug?: string,
): Promise<string> {
  const patch = await loadPublishedProductMirrorPatch(siteId, slug, locale, settings);
  if (!patch) return html;
  return applyProductDetailToMirrorHtml(html, patch.detail, patch.overlay, patch.commerce, {
    templateSlug,
  });
}

export { getProductPageBottomSettings };
