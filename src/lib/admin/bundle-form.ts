import type { BundleFormData } from "@/components/admin/BundleForm";
import { minorToTry } from "@/lib/admin/money";
import { parseProductBadges } from "@/lib/product-badges";
import { htmlToPlainText } from "@/lib/product-content-format";
import type { ProductMediaItem } from "@/lib/product-media";
import { primaryProductImageUrl } from "@/lib/product-media";
import type { ActiveMarketplaceOption } from "@/lib/marketplace/product-prices";
import { parseMarketplacePricesJson, parseMarketplaceMarkupJson } from "@/lib/marketplace/product-prices";
import { DEFAULT_TR_VAT_RATE, normalizeVatRate } from "@/lib/tr-vat-rates";

type BundleRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  descriptionHtml: string | null;
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
  marketplaceMarkupPercentJson?: string | null;
  stockQty: number;
  lowStockThreshold: number;
  weightGrams: number | null;
  pieceCount: number | null;
  desi: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl: string | null;
  badgesJson: string | null;
  published: boolean;
  images?: { url: string; sortOrder: number; mediaType?: string }[];
  bundleComponents?: {
    componentProductId: string;
    componentVariantId: string | null;
    qtyPerBundle: number;
    componentProduct: { title: string };
    componentVariant: { label: string } | null;
  }[];
};

export function emptyBundleForm(): BundleFormData {
  return {
    title: "",
    slug: "",
    description: "",
    descriptionHtml: "",
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
    marketplaceMarkups: {},
    lowStockThreshold: "5",
    weightGrams: "",
    pieceCount: "",
    desi: "",
    seoTitle: "",
    seoDescription: "",
    imageUrl: "",
    mediaItems: [],
    badges: [],
    published: true,
    components: [],
    computedStockQty: 0,
  };
}

export function bundleToForm(
  product: BundleRow,
  activeMarketplaces: ActiveMarketplaceOption[] = [],
): BundleFormData {
  const categoryIds =
    product.categoryLinks?.map((l) => l.categoryId) ??
    (product.categoryId ? [product.categoryId] : []);
  const mediaItems: ProductMediaItem[] =
    product.images?.map((img) => ({
      url: img.url,
      mediaType: (img.mediaType === "video" ? "video" : "image") as "image" | "video",
    })) ?? (product.imageUrl ? [{ url: product.imageUrl, mediaType: "image" }] : []);

  const mp = parseMarketplacePricesJson(product.marketplacePricesJson);
  const markupMap = parseMarketplaceMarkupJson(product.marketplaceMarkupPercentJson);
  const marketplacePrices: Record<string, string> = {};
  const marketplaceMarkups: Record<string, string> = {};
  for (const p of activeMarketplaces) {
    marketplacePrices[p.id] = mp[p.id] != null ? minorToTry(mp[p.id]!) : "";
    marketplaceMarkups[p.id] = markupMap[p.id] != null ? String(markupMap[p.id]) : "";
  }

  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description ?? htmlToPlainText(product.descriptionHtml ?? ""),
    descriptionHtml: product.descriptionHtml ?? "",
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    collectionId: product.collectionId ?? "",
    categoryId: product.categoryId ?? categoryIds[0] ?? "",
    categoryIds,
    brandId: product.brandId ?? "",
    price: minorToTry(product.priceMinor),
    compareAt: product.compareAtMinor ? minorToTry(product.compareAtMinor) : "",
    cost: product.costMinor ? minorToTry(product.costMinor) : "",
    vatRate: normalizeVatRate(product.vatRate ?? DEFAULT_TR_VAT_RATE),
    marketplacePrices,
    marketplaceMarkups,
    lowStockThreshold: String(product.lowStockThreshold),
    weightGrams: product.weightGrams != null ? String(product.weightGrams) : "",
    pieceCount: product.pieceCount != null ? String(product.pieceCount) : "",
    desi: product.desi != null ? String(product.desi) : "",
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    imageUrl: primaryProductImageUrl(mediaItems) ?? product.imageUrl ?? "",
    mediaItems,
    badges: parseProductBadges(product.badgesJson),
    published: product.published,
    components:
      product.bundleComponents?.map((c) => ({
        productId: c.componentProductId,
        variantId: c.componentVariantId,
        qtyPerBundle: c.qtyPerBundle,
        title: c.componentVariant
          ? `${c.componentProduct.title} — ${c.componentVariant.label}`
          : c.componentProduct.title,
      })) ?? [],
    computedStockQty: product.stockQty,
  };
}
