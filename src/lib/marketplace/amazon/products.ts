import type { MarketplaceCatalogFetchResult, MarketplaceCatalogItem } from "@/lib/marketplace/catalog-types";
import type { AmazonSpApiCredentials } from "@/lib/marketplace/amazon/client";
import {
  amazonSpApiRequest,
  getAmazonAccessToken,
  parseAmazonConfig,
  resolveAmazonMarketplaceId,
  AMAZON_TR_MARKETPLACE_ID,
} from "@/lib/marketplace/amazon/client";
import { toMarketplaceSyncPrices } from "@/lib/marketplace/product-prices";
import { minorToAmazonPrice } from "@/lib/marketplace/amazon/inventory";
import { buildPlatformListingTitle } from "@/lib/marketplace/title-rules";
import { upsertProductMarketplaceListing } from "@/lib/marketplace/catalog-import";
import { marketplaceCategoryMappingDb } from "@/lib/marketplace/prisma-marketplace";
import { toAmazonListingImageUrls } from "@/lib/marketplace/amazon/image-url";
import { htmlToPlainText } from "@/lib/product-content-format";
import { formatAmazonListingError } from "@/lib/marketplace/amazon/errors";

const DEFAULT_MARKETPLACE_ID = AMAZON_TR_MARKETPLACE_ID;

function mapAmazonListingStatus(raw: Record<string, unknown>): MarketplaceCatalogItem["listingStatus"] {
  const status = String(raw.status ?? "").toUpperCase();
  if (status.includes("INACTIVE") || status.includes("SUPPRESSED")) return "inactive";
  if (status.includes("INCOMPLETE")) return "pending";
  if (status.includes("ACTIVE") || status.includes("BUYABLE")) return "active";
  return "pending";
}

function parseAmazonListing(raw: Record<string, unknown>): MarketplaceCatalogItem | null {
  const sku = String(raw.sku ?? raw.SellerSku ?? "").trim();
  if (!sku) return null;

  const summaries = (raw.summaries as Record<string, unknown>[]) ?? [];
  const summary = summaries[0] ?? {};
  const asin = String(summary.asin ?? raw.asin ?? "").trim();

  return {
    sku,
    barcode: asin || undefined,
    title: String(summary.itemName ?? raw.title ?? "").trim() || undefined,
    listingStatus: mapAmazonListingStatus(summary),
    meta: {
      asin,
      marketplaceId: summary.marketplaceId,
      status: summary.status,
    },
  };
}

export async function fetchAmazonCatalog(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  config: Record<string, string>,
  options?: { maxPages?: number },
): Promise<MarketplaceCatalogFetchResult> {
  const marketplaceId = config.amazonMarketplaceId?.trim() || DEFAULT_MARKETPLACE_ID;
  const maxPages = options?.maxPages ?? 50;
  const catalog: MarketplaceCatalogItem[] = [];
  const errors: string[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const qs = new URLSearchParams({
      marketplaceIds: marketplaceId,
      sellerId: creds.sellerId,
      pageSize: "20",
      includedData: "summaries,attributes",
    });
    if (pageToken) qs.set("pageToken", pageToken);

    const res = await amazonSpApiRequest(
      creds,
      accessToken,
      `/listings/2021-08-01/items?${qs}`,
    );

    if (!res.ok) {
      if (res.status === 403) {
        errors.push(
          "Toplu katalog listeleme (searchListingsItems) bu uygulama için kısıtlı (Draft/onaysız uygulamalarda olağan). " +
            "Ürün gönderme ve stok/fiyat çalışır; gönderilen ürünler tek tek doğrulanır.",
        );
      } else {
        errors.push(`HTTP ${res.status}: ${res.text.slice(0, 200)}`);
      }
      break;
    }

    const payload = res.json as Record<string, unknown> | null;
    const items = (payload?.items as Record<string, unknown>[]) ?? [];
    if (!items.length) break;

    for (const raw of items) {
      const parsed = parseAmazonListing(raw);
      if (parsed) catalog.push(parsed);
    }

    pageToken = payload?.pagination
      ? String((payload.pagination as Record<string, unknown>).nextToken ?? "").trim() || undefined
      : undefined;
    if (!pageToken) break;
  }

  return {
    ok: catalog.length > 0 || errors.length === 0,
    items: catalog,
    message: `${catalog.length} Amazon listing okundu`,
    errors,
  };
}

// ── Ürün gönderme (yeni ilan oluşturma / güncelleme) ──────────────────────────

type AmazonPushProduct = {
  id: string;
  title: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  descriptionHtml: string | null;
  keyFeaturesHtml: string | null;
  howToUseHtml: string | null;
  priceMinor: number;
  compareAtMinor: number | null;
  stockQty: number;
  categoryId: string | null;
  marketplacePricesJson: string | null;
  marketplaceMarkupPercentJson: string | null;
  brand?: { name: string | null } | null;
  category?: { title: string | null } | null;
  imageUrl?: string | null;
  images?: { url: string }[];
};

/** Amazon seller SKU: ürün SKU'su yoksa slug/barkoddan üretilir (stabil olmalı). */
function resolveAmazonSku(product: AmazonPushProduct): string {
  return (product.sku?.trim() || product.slug?.trim() || product.barcode?.trim() || product.id).slice(
    0,
    40,
  );
}

/** GTIN tipini uzunluktan çıkarır (13=EAN, 12=UPC, aksi halde GTIN). */
function gtinType(barcode: string): "ean" | "upc" | "gtin" {
  const digits = barcode.replace(/\D/g, "");
  if (digits.length === 13) return "ean";
  if (digits.length === 12) return "upc";
  return "gtin";
}

/**
 * Varsayılan Amazon productType. "PRODUCT" Amazon'da geçerli bir tür DEĞİL
 * (ilan oluştururken reddedilir), o yüzden onu ve boşu PET_FOOD'a çeviririz
 * (mağaza ağırlıklı köpek maması/ödülü). Kategori eşlemesi bunu ezebilir.
 */
function resolveAmazonDefaultProductType(config: Record<string, string>): string {
  const raw = config.amazonDefaultProductType?.trim();
  if (!raw || raw.toUpperCase() === "PRODUCT") return "PET_FOOD";
  return raw;
}

/**
 * Kategoriye göre Amazon productType çözer.
 * MarketplaceCategoryMapping.platformCategoryId Amazon için productType string'i taşır
 * (ör. "PET_FOOD"). Yoksa config.amazonDefaultProductType (geçersizse PET_FOOD).
 */
async function resolveAmazonProductType(
  siteId: string,
  categoryId: string | null,
  config: Record<string, string>,
): Promise<string> {
  const fallback = resolveAmazonDefaultProductType(config);
  if (!categoryId) return fallback;
  const db = marketplaceCategoryMappingDb();
  if (!db) return fallback;
  const mapping = await db.findFirst({
    where: { siteId, platform: "amazon_tr", categoryId },
  });
  return mapping?.platformCategoryId?.trim() || fallback;
}

/** Bir ürün için Amazon Listings Items attribute gövdesini oluşturur. */
function buildAmazonAttributes(
  product: AmazonPushProduct,
  marketplaceId: string,
  productType: string,
  config: Record<string, string>,
): Record<string, unknown> {
  const brandName = product.brand?.name?.trim() || "Anatolian Paw";
  const title = buildPlatformListingTitle("amazon_tr", product.title, brandName, {
    categoryTitles: product.category?.title ? [product.category.title] : [],
  });
  const prices = toMarketplaceSyncPrices(product, "amazon_tr");

  const descriptionText =
    htmlToPlainText(product.descriptionHtml ?? "") ||
    product.description?.trim() ||
    title;

  const bulletSource =
    htmlToPlainText(product.keyFeaturesHtml ?? "") || product.description?.trim() || "";
  const bulletPoints = bulletSource
    .split(/\r?\n|•|\u2022|;/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3)
    .map((s) => s.slice(0, 100))
    .slice(0, 5);
  // bullet_point Amazon'da zorunlu (min 1) — hiç yoksa başlıktan üret.
  if (bulletPoints.length === 0) {
    bulletPoints.push(title.slice(0, 100));
  }

  const imageSources: string[] = [];
  if (product.imageUrl?.trim()) imageSources.push(product.imageUrl.trim());
  for (const img of product.images ?? []) {
    if (img.url?.trim()) imageSources.push(img.url.trim());
  }
  const images = toAmazonListingImageUrls(imageSources);

  const attrs: Record<string, unknown> = {
    condition_type: [{ value: "new_new", marketplace_id: marketplaceId }],
    item_name: [{ value: title, language_tag: "tr_TR", marketplace_id: marketplaceId }],
    brand: [{ value: brandName, marketplace_id: marketplaceId }],
    product_description: [
      { value: descriptionText.slice(0, 2000), language_tag: "tr_TR", marketplace_id: marketplaceId },
    ],
    country_of_origin: [{ value: "TR", marketplace_id: marketplaceId }],
    fulfillment_availability: [
      { fulfillment_channel_code: "DEFAULT", quantity: Math.max(0, product.stockQty) },
    ],
    purchasable_offer: [
      {
        marketplace_id: marketplaceId,
        currency: "TRY",
        our_price: [{ schedule: [{ value_with_tax: minorToAmazonPrice(prices.salePriceMinor) }] }],
      },
    ],
  };

  if (prices.listPriceMinor > prices.salePriceMinor) {
    attrs.list_price = [
      { marketplace_id: marketplaceId, currency: "TRY", value: minorToAmazonPrice(prices.listPriceMinor) },
    ];
  }

  if (bulletPoints.length) {
    attrs.bullet_point = bulletPoints.map((value) => ({
      value,
      language_tag: "tr_TR",
      marketplace_id: marketplaceId,
    }));
  }

  if (images.length) {
    attrs.main_product_image_locator = [
      { media_location: images[0], marketplace_id: marketplaceId },
    ];
    images.slice(1, 6).forEach((url, idx) => {
      attrs[`other_product_image_locator_${idx + 1}`] = [
        { media_location: url, marketplace_id: marketplaceId },
      ];
    });
  }

  // PET_FOOD (mama/ödül) için Amazon'un zorunlu tuttuğu ek alanlar.
  if (productType === "PET_FOOD") {
    const featuresText = htmlToPlainText(product.keyFeaturesHtml ?? "");
    const howToUseText = htmlToPlainText(product.howToUseHtml ?? "");
    const manufacturer = config.amazonManufacturer?.trim() || brandName;
    const ingredients =
      featuresText || descriptionText.slice(0, 500) || "%100 doğal, katkısız içerik.";
    const directions =
      howToUseText ||
      "Köpeğinizin boyutuna göre günde 1-2 adet verin. Yanında her zaman temiz su bulundurun.";

    Object.assign(attrs, {
      manufacturer: [{ value: manufacturer, language_tag: "tr_TR", marketplace_id: marketplaceId }],
      rtip_manufacturer_contact_information: [
        {
          value:
            config.amazonManufacturerContact?.trim() || `${manufacturer}, Türkiye`,
          marketplace_id: marketplaceId,
        },
      ],
      ingredients: [
        { value: ingredients.slice(0, 1000), language_tag: "tr_TR", marketplace_id: marketplaceId },
      ],
      directions: [
        { value: directions.slice(0, 1000), language_tag: "tr_TR", marketplace_id: marketplaceId },
      ],
      serving_recommendation: [
        { value: directions.slice(0, 500), language_tag: "tr_TR", marketplace_id: marketplaceId },
      ],
      item_form: [
        {
          value: config.amazonItemForm?.trim() || "Kurutulmuş",
          language_tag: "tr_TR",
          marketplace_id: marketplaceId,
        },
      ],
      number_of_items: [{ value: 1, marketplace_id: marketplaceId }],
      contains_food_or_beverage: [{ value: true, marketplace_id: marketplaceId }],
      contains_liquid_contents: [{ value: false, marketplace_id: marketplaceId }],
      unit_count: [
        { value: 1, type: { value: "Count", language_tag: "tr_TR" }, marketplace_id: marketplaceId },
      ],
      storage_instructions: [
        {
          value: config.amazonStorageInstructions?.trim() || "Serin ve kuru yerde saklayın.",
          language_tag: "tr_TR",
          marketplace_id: marketplaceId,
        },
      ],
      use_by_recommendation: [
        {
          value: "Son kullanma tarihi için ürün ambalajına bakınız.",
          language_tag: "tr_TR",
          marketplace_id: marketplaceId,
        },
      ],
    });
  }

  const barcode = product.barcode?.trim();
  if (barcode) {
    attrs.externally_assigned_product_identifier = [
      { value: barcode, type: gtinType(barcode), marketplace_id: marketplaceId },
    ];
  } else {
    attrs.supplier_declared_has_product_identifier_exemption = [
      { value: true, marketplace_id: marketplaceId },
    ];
  }

  return attrs;
}

/**
 * Web ürünlerini Amazon'a gönderir (Listings Items PUT — oluştur/güncelle).
 * Amazon ilanları asenkron işlenir: ACCEPTED = kuyruğa alındı (pending),
 * INVALID = doğrulama hatası (rejected, hata listesi kaydedilir).
 */
export async function syncProductsToAmazon(
  products: AmazonPushProduct[],
  config: Record<string, string>,
  siteId?: string,
): Promise<{ ok: boolean; sent: number; message: string; errors: string[] }> {
  const creds = parseAmazonConfig(config);
  if (!creds) {
    return {
      ok: false,
      sent: 0,
      message: "Amazon SP-API bilgileri eksik (sellerId, LWA client, refresh token)",
      errors: [],
    };
  }

  const token = await getAmazonAccessToken(creds);
  if (!token.accessToken) {
    return { ok: false, sent: 0, message: token.error ?? "Amazon token alınamadı", errors: [] };
  }

  const marketplaceId = resolveAmazonMarketplaceId(config);
  const publishable = products.filter((p) => p.stockQty >= 0 && p.priceMinor > 0);

  let accepted = 0;
  let rejected = 0;
  const errors: string[] = [];

  for (const product of publishable) {
    const sku = resolveAmazonSku(product);
    const productType = siteId
      ? await resolveAmazonProductType(siteId, product.categoryId, config)
      : resolveAmazonDefaultProductType(config);

    const qs = new URLSearchParams({ marketplaceIds: marketplaceId, issueLocale: "tr_TR" });
    const res = await amazonSpApiRequest(
      creds,
      token.accessToken,
      `/listings/2021-08-01/items/${encodeURIComponent(creds.sellerId)}/${encodeURIComponent(sku)}?${qs}`,
      {
        method: "PUT",
        body: {
          productType,
          requirements: "LISTING",
          attributes: buildAmazonAttributes(product, marketplaceId, productType, config),
        },
      },
    );

    const json = res.json as
      | { status?: string; submissionId?: string; issues?: { message?: string; severity?: string }[] }
      | null;
    const status = json?.status ?? "";
    const issueMsg =
      json?.issues
        ?.filter((x) => (x.severity ?? "ERROR").toUpperCase() === "ERROR")
        .map((x) => x.message)
        .filter(Boolean)
        .map((m) => formatAmazonListingError(String(m)))
        .join("; ") || "";

    if (res.ok && (status === "ACCEPTED" || status === "VALID")) {
      accepted++;
      if (siteId) {
        await upsertProductMarketplaceListing(siteId, product.id, "amazon_tr", {
          barcode: product.barcode?.trim() ?? null,
          listingStatus: "pending",
          lastError: null,
          metaJson: JSON.stringify({ sku, submissionId: json?.submissionId, productType }),
        });
      }
    } else {
      rejected++;
      const reason = issueMsg || `HTTP ${res.status}: ${res.text.slice(0, 160)}`;
      if (errors.length < 8) errors.push(`${product.title.slice(0, 40)} (${sku}): ${reason}`);
      if (siteId) {
        await upsertProductMarketplaceListing(siteId, product.id, "amazon_tr", {
          barcode: product.barcode?.trim() ?? null,
          listingStatus: "rejected",
          lastError: reason,
          metaJson: JSON.stringify({ sku, productType }),
        });
      }
    }
  }

  const errNote = errors.length ? ` · Hata örnekleri: ${errors.slice(0, 3).join(" | ")}` : "";
  return {
    ok: accepted > 0,
    sent: accepted,
    message:
      `${accepted} ürün Amazon'a gönderildi (onay bekliyor), ${rejected} reddedildi.` +
      " Amazon ilanları birkaç dakikada işlenir; Amazon Seller Central → Envanter'den görebilirsiniz." +
      errNote,
    errors,
  };
}

