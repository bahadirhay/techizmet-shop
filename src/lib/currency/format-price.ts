import type { ShopLocale } from "@/lib/i18n/locale";

/**
 * Kuruş (minor) → görüntü fiyatı
 * tr  → "115,00 ₺"
 * en  → "$1.23"  (usdRate verilmişse; yoksa TRY gösterir)
 */
export function formatPrice(
  minor: number,
  locale: ShopLocale,
  usdRate?: number | null,
): string {
  if (locale === "en" && usdRate && usdRate > 0) {
    const usd = minor / 100 / usdRate;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usd);
  }
  // Türkçe: sembol sağda
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
  return `${formatted} ₺`;
}
