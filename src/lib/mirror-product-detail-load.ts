/** Ürün mirror — DB verisini HTML enjeksiyonuna hazırlar (prebuild + runtime) */

import { loadMirrorProductCommerceUncached } from "@/lib/mirror-product-commerce-load";
import type { MirrorProductCommercePayload } from "@/lib/mirror-product-commerce";
import { applyProductDetailToMirrorHtml } from "@/lib/mirror-product-detail-html";
import type { VitrinProductDetail } from "@/lib/mirror-product-detail-sync";
import type { ProductContentOverlay } from "@/lib/mirror-product-overlay";
import { productHighlightsForPatch } from "@/lib/product-highlights";
import { getProductPageBottomSettings } from "@/lib/product-page-bottom";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  localizeMirrorHtmlChunkForLocale,
  localizeMirrorTextForLocale,
} from "@/lib/mirror-en-locale";
import type { SiteSettings } from "@/lib/site-settings";
import { formatProductDisplayTitle } from "@/lib/product-display-title";
import { orderMediaForDisplay, primaryProductImageUrl } from "@/lib/product-media";
import {
  PRODUCT_KIND_BUNDLE,
  loadResolvedBundleComponents,
  buildComponentsSnapshot,
} from "@/lib/product-bundle";
import { loadProductBlogBody } from "@/lib/admin/blog-automation/product-blog-shared";
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
  weightGrams: number | null;
  pieceCount: number | null;
  kind?: string | null;
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

export function vitrinProductDetailFromDb(
  product: DbProduct,
  bundleComponents?: VitrinProductDetail["bundleComponents"],
  locale: ShopLocale = "tr",
): VitrinProductDetail {
  const mediaItems = orderMediaForDisplay(
    product.images.map((image) => ({
      url: image.url,
      mediaType: image.mediaType === "video" ? ("video" as const) : ("image" as const),
    })),
  );
  const imageUrl = primaryProductImageUrl(mediaItems) ?? product.imageUrl;

  const title = formatProductDisplayTitle({
    title: product.title,
    weightGrams: product.weightGrams,
    pieceCount: product.pieceCount,
  });

  return {
    productId: product.id,
    slug: product.slug,
    title: localizeMirrorTextForLocale(title, locale),
    description: product.description
      ? localizeMirrorTextForLocale(product.description, locale)
      : product.description,
    imageUrl,
    images: mediaItems.map((image, i) => ({
      url: image.url,
      alt: product.images[i]?.alt ?? null,
      mediaType: image.mediaType,
    })),
    kind: product.kind ?? "standard",
    bundleComponents,
    variantOptionName: product.variantOptionName,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      label: localizeMirrorTextForLocale(variant.label, locale),
      stockQty: variant.stockQty,
      isDefault: variant.isDefault,
    })),
    highlights: productHighlightsForPatch(product.highlightsJson) ?? undefined,
  };
}

export function productContentOverlayFromDb(
  product: DbProduct,
  locale: ShopLocale = "tr",
): ProductContentOverlay {
  return {
    description: product.description
      ? localizeMirrorTextForLocale(product.description, locale)
      : product.description,
    descriptionHtml: product.descriptionHtml
      ? localizeMirrorHtmlChunkForLocale(product.descriptionHtml, locale)
      : product.descriptionHtml,
    keyFeaturesHtml: product.keyFeaturesHtml
      ? localizeMirrorHtmlChunkForLocale(product.keyFeaturesHtml, locale)
      : product.keyFeaturesHtml,
    howToUseHtml: product.howToUseHtml
      ? localizeMirrorHtmlChunkForLocale(product.howToUseHtml, locale)
      : product.howToUseHtml,
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

  let bundleComponents: VitrinProductDetail["bundleComponents"];
  if (product.kind === PRODUCT_KIND_BUNDLE) {
    const resolved = await loadResolvedBundleComponents(prisma, product.id);
    bundleComponents = buildComponentsSnapshot(resolved, 1);
  }

  const commerce = await loadMirrorProductCommerceUncached(
    siteId,
    slug,
    locale,
    settings.store?.texts,
    { skipSession: true },
  );

  const productBlog = await loadProductBlogBody(siteId, slug);

  return {
    detail: vitrinProductDetailFromDb(product, bundleComponents, locale),
    overlay: {
      ...productContentOverlayFromDb(product, locale),
      productBlogHtml: productBlog?.bodyHtml
        ? localizeMirrorHtmlChunkForLocale(productBlog.bodyHtml, locale)
        : null,
      productBlogTitle: productBlog?.title
        ? localizeMirrorTextForLocale(productBlog.title, locale)
        : null,
      productBlogHref: productBlog?.href ?? null,
    },
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
