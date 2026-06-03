import type { CustomerGroupPricing } from "@/lib/customer-group-pricing";
import { formatTry } from "@/lib/format";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorProductCommercePayload } from "@/lib/mirror-product-commerce";
import { prisma } from "@/lib/prisma";
import {
  minVariantDisplay,
  pickDefaultVariant,
  variantCatalogPrices,
  type VariantRow,
} from "@/lib/product-variants";
import { resolveMirrorProductTexts, type StoreTextSettings } from "@/lib/store-static-texts";

function optionValuesFromLabel(label: string): string[] {
  return label
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Derleme ve çalışma zamanı — önbelleksiz ürün fiyat/varyant (prebuild betiği ile uyumlu) */
export async function loadMirrorProductCommerceUncached(
  siteId: string,
  slug: string,
  locale: ShopLocale,
  textSettings?: StoreTextSettings,
  options?: { skipSession?: boolean; memberPricing?: CustomerGroupPricing | null },
): Promise<MirrorProductCommercePayload | null> {
  const product = await prisma.storeProduct.findUnique({
    where: { siteId_slug: { siteId, slug } },
    include: { variants: { orderBy: { sortOrder: "asc" } } },
  });
  if (!product?.published) return null;

  const memberPricing = options?.memberPricing ?? null;
  const variants: VariantRow[] = product.variants.map((v) => ({
    id: v.id,
    label: v.label,
    sku: v.sku,
    priceMinor: v.priceMinor,
    compareAtMinor: v.compareAtMinor,
    stockQty: v.stockQty,
    sortOrder: v.sortOrder,
    isDefault: v.isDefault,
  }));

  const variantPayload = variants.map((v) => {
    const p = variantCatalogPrices(v, memberPricing);
    return {
      id: v.id,
      label: v.label,
      optionValues: optionValuesFromLabel(v.label),
      priceLabel: formatTry(p.unitMinor),
      compareLabel: p.compareAtMinor ? formatTry(p.compareAtMinor) : null,
      stockQty: v.stockQty,
    };
  });

  const defaultV = pickDefaultVariant(variants);
  let priceLabel: string;
  let compareLabel: string | null;
  let fromPrice = false;
  let inStock = product.stockQty > 0;

  if (variants.length) {
    const min = minVariantDisplay(variants, memberPricing);
    priceLabel = formatTry(min.priceMinor);
    compareLabel = min.compareAtMinor ? formatTry(min.compareAtMinor) : null;
    fromPrice = min.fromPrice;
    inStock = variants.some((v) => v.stockQty > 0);
  } else {
    const p = variantCatalogPrices(
      { priceMinor: product.priceMinor, compareAtMinor: product.compareAtMinor },
      memberPricing,
    );
    priceLabel = formatTry(p.unitMinor);
    compareLabel = p.compareAtMinor ? formatTry(p.compareAtMinor) : null;
    inStock = product.stockQty > 0;
  }

  return {
    productId: product.id,
    slug: product.slug,
    variants: variantPayload,
    defaultVariantId: defaultV?.id ?? null,
    priceLabel,
    compareLabel,
    fromPrice,
    inStock,
    texts: resolveMirrorProductTexts(locale, textSettings),
    share: {
      slug: product.slug,
      title: product.title,
      priceLabel: fromPrice ? `${resolveMirrorProductTexts(locale, textSettings)?.startingPricePrefix ?? "Başlayan fiyat"}: ${priceLabel}` : priceLabel,
      imageUrl: product.imageUrl,
    },
  };
}
