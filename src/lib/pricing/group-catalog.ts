/** Sunucu/istemci güvenli — Prisma yok */

export type CustomerGroupPricing = {
  percent: number;
  groupId: string;
  groupName: string;
};

export function priceAfterGroupDiscount(priceMinor: number, discountPercent: number): number {
  if (discountPercent <= 0 || discountPercent >= 100) return priceMinor;
  return Math.max(0, Math.round((priceMinor * (100 - discountPercent)) / 100));
}

export function applyCatalogPrice(
  catalogPriceMinor: number,
  pricing: CustomerGroupPricing | null,
): { unitMinor: number; listPriceMinor: number } {
  if (!pricing) {
    return { unitMinor: catalogPriceMinor, listPriceMinor: catalogPriceMinor };
  }
  return {
    listPriceMinor: catalogPriceMinor,
    unitMinor: priceAfterGroupDiscount(catalogPriceMinor, pricing.percent),
  };
}
