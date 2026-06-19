import type { ShopLocale } from "@/lib/i18n/locale";
import type { StoreTextSettings } from "@/lib/store-static-texts";
import type { CollectionFilterKey } from "@/lib/collection-filter-facets";

export type CollectionFilterConfig = {
  enabled: Record<CollectionFilterKey, boolean>;
  labels: Record<CollectionFilterKey, string>;
};

const DEFAULT_ENABLED: Record<CollectionFilterKey, boolean> = {
  price: true,
  brand: true,
  tones: true,
  volume: true,
  quantity: true,
  stock: true,
};

function pickLocalized(
  locale: ShopLocale,
  trValue: string | undefined,
  enValue: string | undefined,
  fallbackTr: string,
  fallbackEn: string,
) {
  const isTr = locale === "tr";
  const text = (isTr ? trValue : enValue)?.trim();
  return text || (isTr ? fallbackTr : fallbackEn);
}

export function resolveCollectionFilterConfig(
  locale: ShopLocale,
  overrides: StoreTextSettings | undefined,
): CollectionFilterConfig {
  const flags = overrides?.collectionFilters ?? {};
  return {
    enabled: {
      price: flags.price ?? DEFAULT_ENABLED.price,
      brand: flags.brand ?? DEFAULT_ENABLED.brand,
      tones: flags.tones ?? DEFAULT_ENABLED.tones,
      volume: flags.volume ?? DEFAULT_ENABLED.volume,
      quantity: flags.quantity ?? DEFAULT_ENABLED.quantity,
      stock: flags.stock ?? DEFAULT_ENABLED.stock,
    },
    labels: {
      price: pickLocalized(locale, overrides?.mirrorPriceLabelTr, overrides?.mirrorPriceLabelEn, "Fiyat", "Price"),
      brand: pickLocalized(locale, overrides?.mirrorBrandLabelTr, overrides?.mirrorBrandLabelEn, "Marka", "Brand"),
      tones: pickLocalized(locale, overrides?.mirrorTonesLabelTr, overrides?.mirrorTonesLabelEn, "Tonlar", "Tones"),
      volume: pickLocalized(
        locale,
        overrides?.mirrorVolumeLabelTr,
        overrides?.mirrorVolumeLabelEn,
        "Hacim",
        "Volume",
      ),
      quantity: pickLocalized(
        locale,
        overrides?.mirrorQuantityLabelTr,
        overrides?.mirrorQuantityLabelEn,
        "Adet",
        "Quantity",
      ),
      stock: pickLocalized(
        locale,
        overrides?.mirrorStockLabelTr,
        overrides?.mirrorStockLabelEn,
        "Stok durumu",
        "Availability",
      ),
    },
  };
}
