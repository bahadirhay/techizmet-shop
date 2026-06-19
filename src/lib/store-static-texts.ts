import type { ShopLocale } from "@/lib/i18n/locale";
import type { StoreMessages } from "@/lib/i18n/messages";

export type StoreTextSettings = {
  blocks?: Partial<StoreMessages["blocks"]>;
  collectionsListTitleTr?: string;
  collectionsListTitleEn?: string;
  collectionsListLeadTr?: string;
  collectionsListLeadEn?: string;
  collectionsListEmptyTr?: string;
  collectionsListEmptyEn?: string;
  productGridEmptyTr?: string;
  productGridEmptyEn?: string;
  mirrorCategoriesLabelTr?: string;
  mirrorCategoriesLabelEn?: string;
  mirrorProductCountSingularTr?: string;
  mirrorProductCountSingularEn?: string;
  mirrorProductCountPluralTr?: string;
  mirrorProductCountPluralEn?: string;
  mirrorSoldOutBadgeTr?: string;
  mirrorSoldOutBadgeEn?: string;
  mirrorLowStockPrefixTr?: string;
  mirrorLowStockPrefixEn?: string;
  mirrorStartingPricePrefixTr?: string;
  mirrorStartingPricePrefixEn?: string;
  mirrorPriceLabelTr?: string;
  mirrorPriceLabelEn?: string;
  mirrorBrandLabelTr?: string;
  mirrorBrandLabelEn?: string;
  mirrorTonesLabelTr?: string;
  mirrorTonesLabelEn?: string;
  mirrorVolumeLabelTr?: string;
  mirrorVolumeLabelEn?: string;
  mirrorQuantityLabelTr?: string;
  mirrorQuantityLabelEn?: string;
  mirrorStockLabelTr?: string;
  mirrorStockLabelEn?: string;
  /** Ana sayfa ürün listesi sıralaması */
  homeListingSort?: "title_asc" | "title_desc" | "newest" | "oldest" | "price_asc" | "price_desc";
  collectionFilters?: {
    price?: boolean;
    brand?: boolean;
    tones?: boolean;
    volume?: boolean;
    quantity?: boolean;
    stock?: boolean;
  };
};

type StoreBlockMessages = StoreMessages["blocks"];

export type ResolvedCollectionsFallbackTexts = {
  title: string;
  lead: string;
  empty: string;
};

export type ResolvedMirrorCollectionTexts = {
  categoriesLabel: string;
  productCountSingular: string;
  productCountPlural: string;
  soldOutBadge: string;
  lowStockPrefix: string;
};

export type ResolvedMirrorProductTexts = {
  startingPricePrefix: string;
};

function clean(value: string | undefined | null): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

function isTr(locale: ShopLocale) {
  return locale === "tr";
}

function pickLocalized(
  locale: ShopLocale,
  trValue: string | undefined,
  enValue: string | undefined,
  fallbackTr: string,
  fallbackEn: string,
) {
  if (isTr(locale)) return clean(trValue) ?? fallbackTr;
  return clean(enValue) ?? fallbackEn;
}

export function resolveStoreBlockMessages(
  _locale: ShopLocale,
  overrides: StoreTextSettings | undefined,
  base: StoreBlockMessages,
): StoreBlockMessages {
  const group = overrides?.blocks ?? {};
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(group).filter(([, value]) => typeof value === "string" && value.trim()),
    ),
  } as StoreBlockMessages;
}

export function resolveCollectionsFallbackTexts(
  locale: ShopLocale,
  overrides: StoreTextSettings | undefined,
): ResolvedCollectionsFallbackTexts {
  return {
    title: pickLocalized(locale, overrides?.collectionsListTitleTr, overrides?.collectionsListTitleEn, "Koleksiyonlarımız", "Our Skincare Picks"),
    lead: pickLocalized(
      locale,
      overrides?.collectionsListLeadTr,
      overrides?.collectionsListLeadEn,
      "Cildiniz için güvenilir favoriler.",
      "Whether you're starting a new routine or upgrading your current one, these favorites deliver radiant, healthy-looking skin.",
    ),
    empty: pickLocalized(
      locale,
      overrides?.collectionsListEmptyTr,
      overrides?.collectionsListEmptyEn,
      "Henüz koleksiyon eklenmedi.",
      "No collections available yet.",
    ),
  };
}

export function resolveProductGridEmptyText(locale: ShopLocale, overrides: StoreTextSettings | undefined) {
  return pickLocalized(
    locale,
    overrides?.productGridEmptyTr,
    overrides?.productGridEmptyEn,
    "Şu an listelenecek ürün yok.",
    "No products to show right now.",
  );
}

export function resolveMirrorCollectionTexts(
  locale: ShopLocale,
  overrides: StoreTextSettings | undefined,
): ResolvedMirrorCollectionTexts {
  return {
    categoriesLabel: pickLocalized(
      locale,
      overrides?.mirrorCategoriesLabelTr,
      overrides?.mirrorCategoriesLabelEn,
      "Kategoriler",
      "Categories",
    ),
    productCountSingular: pickLocalized(
      locale,
      overrides?.mirrorProductCountSingularTr,
      overrides?.mirrorProductCountSingularEn,
      "Ürün",
      "Product",
    ),
    productCountPlural: pickLocalized(
      locale,
      overrides?.mirrorProductCountPluralTr,
      overrides?.mirrorProductCountPluralEn,
      "Ürünler",
      "Products",
    ),
    soldOutBadge: pickLocalized(
      locale,
      overrides?.mirrorSoldOutBadgeTr,
      overrides?.mirrorSoldOutBadgeEn,
      "Tükendi",
      "Sold out",
    ),
    lowStockPrefix: pickLocalized(
      locale,
      overrides?.mirrorLowStockPrefixTr,
      overrides?.mirrorLowStockPrefixEn,
      "Son",
      "Only",
    ),
  };
}

export function resolveMirrorProductTexts(
  locale: ShopLocale,
  overrides: StoreTextSettings | undefined,
): ResolvedMirrorProductTexts {
  return {
    startingPricePrefix: pickLocalized(
      locale,
      overrides?.mirrorStartingPricePrefixTr,
      overrides?.mirrorStartingPricePrefixEn,
      "Başlayan fiyat",
      "Starting price",
    ),
  };
}
