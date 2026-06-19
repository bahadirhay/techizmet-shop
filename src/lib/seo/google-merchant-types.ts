/** Google Merchant Center ürün feed ayarları */
export type GoogleMerchantSettings = {
  /** Feed üretimi açık */
  enabled?: boolean;
  /** Google ürün kategorisi (sayısal ID) — örn. 5015 = Dog Supplies */
  googleProductCategory?: string;
  /** Para birimi (ISO 4217) */
  currency?: string;
  /** Üründe marka yoksa kullanılacak varsayılan marka */
  defaultBrand?: string;
  condition?: "new" | "refurbished" | "used";
  /** Feed URL koruması — boşsa herkese açık */
  feedToken?: string;
  /** Ülke kodu (g:shipping) */
  shippingCountry?: string;
  /** Sabit kargo ücreti (kuruş) — 0 = ücretsiz */
  shippingPriceMinor?: number;
};

export type ResolvedGoogleMerchantConfig = {
  enabled: boolean;
  googleProductCategory: string;
  currency: string;
  defaultBrand: string;
  condition: "new" | "refurbished" | "used";
  feedToken: string;
  shippingCountry: string;
  shippingPriceMinor: number;
};

export function parseGoogleMerchantSettings(
  raw: GoogleMerchantSettings | undefined,
  siteName: string,
): ResolvedGoogleMerchantConfig {
  const s = raw ?? {};
  return {
    enabled: s.enabled !== false,
    googleProductCategory: s.googleProductCategory?.trim() || "5015",
    currency: s.currency?.trim().toUpperCase() || "TRY",
    defaultBrand: s.defaultBrand?.trim() || siteName,
    condition: s.condition ?? "new",
    feedToken: s.feedToken?.trim() || "",
    shippingCountry: s.shippingCountry?.trim().toUpperCase() || "TR",
    shippingPriceMinor: Math.max(0, Number(s.shippingPriceMinor) || 0),
  };
}
