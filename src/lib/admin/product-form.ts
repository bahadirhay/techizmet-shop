import type { ProductFormData } from "@/components/admin/ProductForm";
import { minorToTry } from "@/lib/admin/money";
import { parseProductBadges } from "@/lib/product-badges";
import { htmlToPlainText } from "@/lib/product-content-format";
import {
  isSiteDefaultExploreJson,
  parseExploreLooksJson,
  type ProductExploreLook,
} from "@/lib/product-explore-looks";
import type { ProductHighlight } from "@/lib/product-highlights";
import { emptyProductHighlights, parseProductHighlightsJson } from "@/lib/product-highlights";
import type { ProductMediaItem } from "@/lib/product-media";
import { primaryProductImageUrl } from "@/lib/product-media";
import type { VariantFormRow } from "@/lib/product-variants";
import type { ActiveMarketplaceOption } from "@/lib/marketplace/product-prices";
import { parseMarketplacePricesJson } from "@/lib/marketplace/product-prices";
import { DEFAULT_TR_VAT_RATE, normalizeVatRate } from "@/lib/tr-vat-rates";

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  descriptionHtml: string | null;
  keyFeaturesHtml: string | null;
  howToUseHtml: string | null;
  highlightsJson: string | null;
  exploreLooksJson: string | null;
  sku: string | null;
  barcode: string | null;
  collectionId: string | null;
  categoryId: string | null;
  categoryLinks?: { categoryId: string; sortOrder: number }[];
  brandId: string | null;
  priceMinor: number;
  compareAtMinor: number | null;
  costMinor: number | null;
  vatRate?: number;
  marketplacePricesJson?: string | null;
  stockQty: number;
  lowStockThreshold: number;
  weightGrams: number | null;
  desi: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl: string | null;
  badgesJson: string | null;
  variantOptionName: string | null;
  published: boolean;
  images?: { url: string; sortOrder: number; mediaType?: string }[];
  variants?: {
    id: string;
    label: string;
    sku: string | null;
    priceMinor: number;
    compareAtMinor: number | null;
    stockQty: number;
    isDefault: boolean;
    sortOrder: number;
  }[];
};

export function emptyProductForm(): ProductFormData {
  return {
    title: "",
    slug: "",
    description: "",
    descriptionHtml: "",
    keyFeaturesHtml: "",
    howToUseHtml: "",
    highlights: emptyProductHighlights(),
    sku: "",
    barcode: "",
    collectionId: "",
    categoryId: "",
    categoryIds: [],
    brandId: "",
    price: "",
    compareAt: "",
    cost: "",
    vatRate: DEFAULT_TR_VAT_RATE,
    marketplacePrices: {},
    stockQty: "0",
    lowStockThreshold: "5",
    weightGrams: "",
    desi: "",
    seoTitle: "",
    seoDescription: "",
    imageUrl: "",
    imageUrls: [],
    mediaItems: [],
    badges: [],
    variantOptionName: "",
    variants: [],
    exploreLooks: [],
    useSiteDefaultExplore: false,
    published: false,
  };
}

export function productToForm(
  p: ProductRow,
  activeMarketplaces: ActiveMarketplaceOption[] = [],
): ProductFormData {
  const mpMap = parseMarketplacePricesJson(p.marketplacePricesJson);
  const marketplacePrices: Record<string, string> = {};
  for (const m of activeMarketplaces) {
    const minor = mpMap[m.id];
    marketplacePrices[m.id] = minor != null ? minorToTry(minor) : "";
  }
  const mediaItems: ProductMediaItem[] = p.images?.length
    ? p.images
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => ({
          url: i.url,
          mediaType: i.mediaType === "video" ? "video" : "image",
        }))
    : p.imageUrl
      ? [{ url: p.imageUrl, mediaType: "image" as const }]
      : [];
  const urls = mediaItems.map((m) => m.url);
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description ?? "",
    descriptionHtml: htmlToPlainText(p.descriptionHtml),
    keyFeaturesHtml: htmlToPlainText(p.keyFeaturesHtml),
    howToUseHtml: htmlToPlainText(p.howToUseHtml),
    highlights: parseProductHighlightsJson(p.highlightsJson),
    sku: p.sku ?? "",
    barcode: p.barcode ?? "",
    collectionId: p.collectionId ?? "",
    categoryId: p.categoryId ?? "",
    categoryIds:
      p.categoryLinks?.length
        ? p.categoryLinks
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((link) => link.categoryId)
        : p.categoryId
          ? [p.categoryId]
          : [],
    brandId: p.brandId ?? "",
    price: minorToTry(p.priceMinor),
    compareAt: p.compareAtMinor ? minorToTry(p.compareAtMinor) : "",
    cost: p.costMinor ? minorToTry(p.costMinor) : "",
    vatRate: normalizeVatRate(p.vatRate),
    marketplacePrices,
    stockQty: String(p.stockQty),
    lowStockThreshold: String(p.lowStockThreshold),
    weightGrams: p.weightGrams != null ? String(p.weightGrams) : "",
    desi: p.desi != null ? String(p.desi) : "",
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    imageUrl: primaryProductImageUrl(mediaItems) ?? "",
    imageUrls: urls,
    mediaItems,
    badges: parseProductBadges(p.badgesJson),
    variantOptionName: p.variantOptionName ?? "",
    variants: (p.variants ?? []).map(
      (v): VariantFormRow => ({
        id: v.id,
        label: v.label,
        price: minorToTry(v.priceMinor),
        compareAt: v.compareAtMinor ? minorToTry(v.compareAtMinor) : "",
        stockQty: String(v.stockQty),
        sku: v.sku ?? "",
        isDefault: v.isDefault,
      }),
    ),
    exploreLooks: parseExploreLooksJson(p.exploreLooksJson) ?? [],
    useSiteDefaultExplore: isSiteDefaultExploreJson(p.exploreLooksJson),
    published: p.published,
  };
}
