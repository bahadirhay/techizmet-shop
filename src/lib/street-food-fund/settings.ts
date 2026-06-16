import type { ShopLocale } from "@/lib/i18n/locale";
import type { SiteSettings } from "@/lib/site-settings";
import type { StreetFoodFundSettings } from "@/lib/street-food-fund/types";

export const DEFAULT_STREET_FOOD_TARGET_GRAMS = 50_000;

export const DEFAULT_STREET_FOOD_SLOGAN_TR =
  "Ödül Dostunu Mutlu Eder, Siparişin Bir Sokak Dostunu Doyurur.";

export const DEFAULT_STREET_FOOD_COUNTER_SUBTEXT_TR = "Bu siparişle sen de katkı sağlıyorsun.";

export function getStreetFoodFundSettings(settings: SiteSettings): Required<
  Pick<
    StreetFoodFundSettings,
    | "enabled"
    | "defaultTargetGrams"
    | "sloganTr"
    | "sloganEn"
    | "counterSubtextTr"
    | "counterSubtextEn"
    | "detailPath"
    | "includeMarketplaceOrders"
  >
> {
  const raw = settings.streetFoodFund ?? {};
  return {
    enabled: raw.enabled === true,
    defaultTargetGrams: raw.defaultTargetGrams && raw.defaultTargetGrams > 0
      ? raw.defaultTargetGrams
      : DEFAULT_STREET_FOOD_TARGET_GRAMS,
    sloganTr: raw.sloganTr?.trim() || DEFAULT_STREET_FOOD_SLOGAN_TR,
    sloganEn: raw.sloganEn?.trim() || DEFAULT_STREET_FOOD_SLOGAN_TR,
    counterSubtextTr: raw.counterSubtextTr?.trim() || DEFAULT_STREET_FOOD_COUNTER_SUBTEXT_TR,
    counterSubtextEn: raw.counterSubtextEn?.trim() || "Your order helps feed a street friend.",
    detailPath: raw.detailPath?.trim() || "/sokak-dostlari",
    includeMarketplaceOrders: raw.includeMarketplaceOrders === true,
  };
}

export function streetFoodTexts(locale: ShopLocale, settings: SiteSettings) {
  const cfg = getStreetFoodFundSettings(settings);
  const isTr = locale !== "en";
  return {
    title: isTr ? "Sokak Dostları Mama Fonu" : "Street Friends Food Fund",
    slogan: isTr ? cfg.sloganTr : cfg.sloganEn,
    counterSubtext: isTr ? cfg.counterSubtextTr : cfg.counterSubtextEn,
    detailPath: cfg.detailPath,
  };
}
