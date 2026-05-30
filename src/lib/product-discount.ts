/** Liste fiyatına göre indirim yüzdesi (yuvarlanmış) */
export function discountPercent(compareAtMinor: number, priceMinor: number): number | null {
  if (compareAtMinor <= priceMinor || compareAtMinor <= 0) return null;
  return Math.round(((compareAtMinor - priceMinor) / compareAtMinor) * 100);
}

export function formatPercentOffBadge(percent: number): string {
  return `%${percent} İNDİRİM`;
}

export function percentOffFromPrices(
  compareAtMinor: number | null | undefined,
  priceMinor: number,
): number | null {
  if (compareAtMinor == null || compareAtMinor <= priceMinor) return null;
  return discountPercent(compareAtMinor, priceMinor);
}
