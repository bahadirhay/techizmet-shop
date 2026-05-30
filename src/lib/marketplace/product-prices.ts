import { tryToMinor } from "@/lib/admin/money";

export type MarketplacePricesMap = Record<string, number>;

export type ActiveMarketplaceOption = { id: string; label: string };

export type ProductChannelPriceSource = {
  priceMinor: number;
  compareAtMinor?: number | null;
  marketplacePricesJson?: string | null;
};

/** JSON → platform → kuruş */
export function parseMarketplacePricesJson(raw: string | null | undefined): MarketplacePricesMap {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: MarketplacePricesMap = {};
    for (const [platform, val] of Object.entries(parsed)) {
      const minor =
        typeof val === "number" && Number.isFinite(val)
          ? Math.round(val)
          : tryToMinor(val as string | number);
      if (minor > 0) out[platform] = minor;
    }
    return out;
  } catch {
    return {};
  }
}

/** Form/API gövdesinden kayıt için JSON üretir. Boş alan = web fiyatı kullanılır. */
export function serializeMarketplacePricesFromForm(
  prices: Record<string, string | number | undefined | null>,
): string | null {
  const out: MarketplacePricesMap = {};
  for (const [platform, val] of Object.entries(prices)) {
    if (val == null || val === "") continue;
    const minor = tryToMinor(val);
    if (minor > 0) out[platform] = minor;
  }
  return Object.keys(out).length ? JSON.stringify(out) : null;
}

/** Pazaryeri satış fiyatı — tanımlı değilse web fiyatına düşer. */
export function resolveMarketplaceSalePriceMinor(
  product: ProductChannelPriceSource,
  platform: string,
): number {
  const map = parseMarketplacePricesJson(product.marketplacePricesJson);
  const channel = map[platform];
  if (channel != null && channel > 0) return channel;
  return product.priceMinor;
}

/** Pazaryeri liste fiyatı — karşılaştırma fiyatı web’de yüksekse korunur. */
export function resolveMarketplaceListPriceMinor(
  product: ProductChannelPriceSource,
  platform: string,
): number {
  const sale = resolveMarketplaceSalePriceMinor(product, platform);
  const compare = product.compareAtMinor;
  if (compare != null && compare > sale) return compare;
  return sale;
}

export function hasDistinctMarketplacePrice(
  product: ProductChannelPriceSource,
  platform: string,
): boolean {
  const map = parseMarketplacePricesJson(product.marketplacePricesJson);
  const channel = map[platform];
  return channel != null && channel > 0 && channel !== product.priceMinor;
}

export function marketplacePriceSummary(
  product: ProductChannelPriceSource,
  platform: string,
): "channel" | "web_fallback" {
  return hasDistinctMarketplacePrice(product, platform) ? "channel" : "web_fallback";
}

export function toMarketplaceSyncPrices(
  product: ProductChannelPriceSource,
  platform: string,
): { salePriceMinor: number; listPriceMinor: number } {
  return {
    salePriceMinor: resolveMarketplaceSalePriceMinor(product, platform),
    listPriceMinor: resolveMarketplaceListPriceMinor(product, platform),
  };
}
