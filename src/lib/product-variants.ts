import { applyCatalogPrice, type CustomerGroupPricing } from "@/lib/pricing/group-catalog";

export type VariantRow = {
  id: string;
  label: string;
  sku: string | null;
  priceMinor: number;
  compareAtMinor: number | null;
  stockQty: number;
  sortOrder: number;
  isDefault: boolean;
};

export type VariantFormRow = {
  id?: string;
  label: string;
  price: string;
  compareAt: string;
  stockQty: string;
  sku: string;
  isDefault: boolean;
};

export function pickDefaultVariant<T extends { isDefault: boolean; sortOrder: number }>(
  variants: T[],
): T | undefined {
  if (!variants.length) return undefined;
  return variants.find((v) => v.isDefault) ?? [...variants].sort((a, b) => a.sortOrder - b.sortOrder)[0];
}

export function variantCatalogPrices(
  variant: { priceMinor: number; compareAtMinor: number | null },
  memberPricing: CustomerGroupPricing | null,
) {
  const priced = applyCatalogPrice(variant.priceMinor, memberPricing);
  const compareAt =
    variant.compareAtMinor && variant.compareAtMinor > priced.unitMinor
      ? variant.compareAtMinor
      : priced.listPriceMinor > priced.unitMinor
        ? priced.listPriceMinor
        : null;
  return { unitMinor: priced.unitMinor, listPriceMinor: priced.listPriceMinor, compareAtMinor: compareAt };
}

export function minVariantDisplay(
  variants: VariantRow[],
  memberPricing: CustomerGroupPricing | null,
): { priceMinor: number; compareAtMinor: number | null; fromPrice: boolean } {
  if (!variants.length) return { priceMinor: 0, compareAtMinor: null, fromPrice: false };
  let minUnit = Infinity;
  let compareAt: number | null = null;
  for (const v of variants) {
    const p = variantCatalogPrices(v, memberPricing);
    if (p.unitMinor < minUnit) {
      minUnit = p.unitMinor;
      compareAt = p.compareAtMinor;
    }
  }
  return {
    priceMinor: minUnit === Infinity ? 0 : minUnit,
    compareAtMinor: compareAt,
    fromPrice: variants.length > 1,
  };
}

export function resolveCompareForBadges(
  priceMinor: number,
  compareAtMinor: number | null | undefined,
): { compareAtMinor: number | null; priceMinor: number } {
  return {
    priceMinor,
    compareAtMinor:
      compareAtMinor != null && compareAtMinor > priceMinor ? compareAtMinor : null,
  };
}

