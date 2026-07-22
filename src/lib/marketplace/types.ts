export type MarketplacePlatformId =
  | "trendyol"
  | "hepsiburada"
  | "n11"
  | "amazon_tr"
  | "ciceksepeti"
  | "pazarama";

export type MarketplaceActionResult = {
  ok: boolean;
  itemsCount: number;
  message: string;
  /** Sipariş çekiminde ek özet (UI / log). */
  fetchedCount?: number;
  importedCount?: number;
  repairedCount?: number;
  skippedCount?: number;
  errorCount?: number;
};

export type MarketplaceOrderMeta = {
  shipmentPackageId: number;
  orderNumber: string;
  tyStatus?: string;
  lines: { lineId: number; quantity: number; barcode?: string; merchantSku?: string }[];
  invoiceNumber?: string;
  invoiceLink?: string;
};

export function parseMarketplaceOrderMeta(raw: string | null | undefined): MarketplaceOrderMeta | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as MarketplaceOrderMeta;
  } catch {
    return null;
  }
}

export function marketplacePackageRef(platform: string, packageId: number | string): string {
  return `${platform}:pkg:${packageId}`;
}
