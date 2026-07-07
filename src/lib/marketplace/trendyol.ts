import { minorToTry } from "@/lib/admin/money";
import { toMarketplaceSyncPrices } from "@/lib/marketplace/product-prices";
import { resolveTrendyolCategoryBrand } from "@/lib/marketplace/category-mapping";
import { resolveTrendyolAttributes, mergeTrendyolAttributes, parseProductAttributes } from "@/lib/marketplace/attribute-mapping";
import type { TrendyolPayloadAttribute } from "@/lib/marketplace/attribute-mapping";
import { marketplaceProductListingDb } from "@/lib/marketplace/prisma-marketplace";
import { buildPlatformListingTitle } from "@/lib/marketplace/title-rules";
import { parseTrendyolConfig, trendyolApiBase } from "@/lib/marketplace/trendyol/client";
import { trendyolAuthHeaders } from "@/lib/marketplace/trendyol/headers";
import { checkTrendyolBatchRequest } from "@/lib/marketplace/trendyol/categories";
import { syncTrendyolPriceAndInventory } from "@/lib/marketplace/trendyol/inventory";
import { toAbsoluteMediaUrl } from "@/lib/seo/site-url";
import { prisma } from "@/lib/prisma";

type TrendyolProduct = {
  barcode: string;
  title: string;
  productMainId: string;
  stockCode: string;
  brandId: number;
  categoryId: number;
  quantity: number;
  listPrice: number;
  salePrice: number;
  vatRate: number;
  cargoCompanyId: number;
  currencyType: string;
  dimensionalWeight: number;
  deliveryOption?: { deliveryDuration: number };
  shipmentAddressId?: number;
  returningAddressId?: number;
  description?: string;
  images?: { url: string }[];
  attributes?: TrendyolPayloadAttribute[];
};

export type TrendyolSyncResult = {
  ok: boolean;
  sent: number;
  message: string;
  httpStatus?: number;
};

type SyncProductInput = {
  id: string;
  slug: string;
  title: string;
  barcode: string | null;
  sku: string | null;
  categoryId: string | null;
  priceMinor: number;
  compareAtMinor: number | null;
  marketplacePricesJson?: string | null;
  marketplaceAttributesJson?: string | null;
  stockQty: number;
  description: string | null;
  imageUrl: string | null;
  images?: { url: string }[];
  brand?: { name: string } | null;
  vatRate?: number | null;
  desi?: number | null;
  weightGrams?: number | null;
};

function num(v: string | undefined | null): number | undefined {
  const n = Number((v ?? "").toString().trim());
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Barkodu olmayan ürün için SKU/slug'dan kararlı barkod üretir (Trendyol: max 40, alfanumerik + .-_). */
function generateBarcode(sku: string | null | undefined, slug: string): string | null {
  const raw = (sku?.trim() || slug?.trim() || "").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  if (!raw) return null;
  return raw.slice(0, 40);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function productDimensionalWeight(p: SyncProductInput, fallback: number): number {
  if (p.desi != null && p.desi > 0) return p.desi;
  if (p.weightGrams != null && p.weightGrams > 0) return Math.max(1, Math.ceil(p.weightGrams / 1000));
  return fallback;
}

type TrendyolProductUpdate = {
  barcode: string;
  title: string;
  productMainId: string;
  stockCode: string;
  brandId: number;
  categoryId: number;
  vatRate: number;
  shipmentAddressId?: number;
  returningAddressId?: number;
  description?: string;
  images?: { url: string }[];
  attributes?: TrendyolPayloadAttribute[];
  deliveryOption?: { deliveryDuration: number };
};

type TrendyolBatchResult = {
  ok: boolean;
  sent: number;
  message: string;
  httpStatus?: number;
  batchByBarcode: Map<string, { status: string; error: string | null }>;
  sentProducts: SyncProductInput[];
};

function isDuplicateCreateError(detail: string): boolean {
  const d = detail.toLocaleLowerCase("tr");
  return d.includes("tekrarl") || d.includes("duplicate") || d.includes("zaten");
}

async function sendTrendyolProductBatch(
  creds: NonNullable<ReturnType<typeof parseTrendyolConfig>>,
  method: "POST" | "PUT",
  items: TrendyolProduct[] | TrendyolProductUpdate[],
  sentProducts: SyncProductInput[],
  siteId?: string,
): Promise<TrendyolBatchResult> {
  const url = `${trendyolApiBase(creds)}/integration/product/sellers/${creds.sellerId}/products`;
  const batchByBarcode = new Map<string, { status: string; error: string | null }>();

  if (items.length === 0) {
    return { ok: true, sent: 0, message: "", batchByBarcode, sentProducts: [] };
  }

  const res = await fetch(url, {
    method,
    headers: trendyolAuthHeaders(creds),
    body: JSON.stringify({ items }),
  });
  const text = await res.text();
  let detail = text.slice(0, 500);
  let batchRequestId: string | undefined;
  try {
    const j = JSON.parse(text) as { errors?: { message?: string }[]; batchRequestId?: string };
    if (j.batchRequestId) {
      batchRequestId = j.batchRequestId;
      detail = `batchRequestId: ${j.batchRequestId}`;
    }
    if (j.errors?.[0]?.message) detail = j.errors.map((e) => e.message).join("; ");
  } catch {
    /* raw */
  }

  if (!res.ok) {
    return {
      ok: false,
      sent: 0,
      message: `Trendyol HTTP ${res.status}: ${detail}`,
      httpStatus: res.status,
      batchByBarcode,
      sentProducts: [],
    };
  }

  let batchSummary = "";
  if (batchRequestId) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise((r) => setTimeout(r, attempt === 0 ? 2500 : 2500));
      const batch = await checkTrendyolBatchRequest(creds, batchRequestId);
      if (!batch.ok) break;
      if (batch.status === "COMPLETED" || batch.items.length > 0) {
        let failed = 0;
        for (const it of batch.items) {
          const bc = it.barcode.trim();
          if (!bc) continue;
          if (it.status === "FAILED") {
            failed++;
            batchByBarcode.set(bc, { status: "rejected", error: it.failureReasons.join("; ") });
          } else if (it.status === "SUCCESS") {
            batchByBarcode.set(bc, { status: "pending", error: null });
          }
        }
        const okCount = batch.items.length - failed;
        batchSummary = ` · Sonuç: ${okCount} kabul, ${failed} hata`;
        if (batch.status === "COMPLETED") break;
      }
    }
    if (!batchSummary) {
      batchSummary =
        " · Trendyol kuyruğa aldı, onay birkaç dakika sürebilir. Birazdan “Trendyol durumunu yenile”ye basın.";
    }
  }

  if (siteId) {
    const listingDb = marketplaceProductListingDb();
    if (listingDb) {
      const now = new Date();
      const meta = batchRequestId ? JSON.stringify({ batchRequestId }) : null;
      for (const p of sentProducts) {
        const bc = p.barcode?.trim() ?? "";
        const result = batchByBarcode.get(bc);
        await listingDb.upsert({
          where: {
            siteId_platform_productId: {
              siteId,
              platform: "trendyol",
              productId: p.id,
            },
          },
          create: {
            siteId,
            platform: "trendyol",
            productId: p.id,
            barcode: bc || null,
            listingStatus: result?.status ?? "pending",
            lastSyncAt: now,
            lastError: result?.error ?? null,
            metaJson: meta,
          },
          update: {
            barcode: bc || null,
            listingStatus: result?.status ?? "pending",
            lastSyncAt: now,
            lastError: result?.error ?? null,
            metaJson: meta,
          },
        });
      }
    }
  }

  const failedCount = [...batchByBarcode.values()].filter((v) => v.status === "rejected").length;
  const verb = method === "POST" ? "oluşturuldu" : "güncellendi";
  return {
    ok: failedCount === 0,
    sent: items.length,
    message: `${items.length} ürün Trendyol'da ${verb}. ${detail}${batchSummary}`,
    httpStatus: res.status,
    batchByBarcode,
    sentProducts,
  };
}

function buildTrendyolItemBase(
  p: SyncProductInput,
  mapped: { categoryId: number; brandId: number },
  config: Record<string, string>,
  attributes: TrendyolPayloadAttribute[],
) {
  const shipmentAddressId = num(config.shipmentAddressId);
  const returningAddressId = num(config.returningAddressId);
  const deliveryDuration = num(config.deliveryDuration);
  const defaultVatRate = Number(config.vatRate ?? config.defaultVatRate ?? "");
  const imageUrls = Array.from(
    new Set(
      [
        ...(p.imageUrl ? [p.imageUrl] : []),
        ...(p.images?.map((i) => i.url).filter(Boolean) ?? []),
      ]
        .map((u) => toAbsoluteMediaUrl(u))
        .filter((u): u is string => Boolean(u) && /^https:\/\//i.test(u!)),
    ),
  ).slice(0, 8);

  const vatRate =
    p.vatRate != null && p.vatRate >= 0
      ? p.vatRate
      : Number.isFinite(defaultVatRate) && defaultVatRate >= 0
        ? defaultVatRate
        : 20;

  return {
    barcode: p.barcode!.trim(),
    title: buildPlatformListingTitle("trendyol", p.title, p.brand?.name ?? undefined),
    productMainId: p.sku?.trim() || p.slug,
    stockCode: p.sku?.trim() || p.slug,
    brandId: mapped.brandId,
    categoryId: mapped.categoryId,
    vatRate,
    deliveryOption: deliveryDuration ? { deliveryDuration } : undefined,
    shipmentAddressId,
    returningAddressId,
    description: (p.description ?? "").slice(0, 3000) || undefined,
    images: imageUrls.length ? imageUrls.map((url) => ({ url })) : undefined,
    attributes: attributes.length ? attributes : undefined,
  };
}

/** Trendyol Supplier API — ürün aktarımı (oluştur veya güncelle) */
export async function syncProductsToTrendyol(
  products: SyncProductInput[],
  config: Record<string, string>,
  siteId?: string,
): Promise<TrendyolSyncResult> {
  const creds = parseTrendyolConfig(config);
  if (!creds) {
    return { ok: false, sent: 0, message: "Satıcı ID, API Key ve API Secret zorunlu." };
  }

  const defaultBrandId = Number(config.trendyolBrandId ?? config.brandId ?? 0);
  const defaultCategoryId = Number(config.trendyolCategoryId ?? config.categoryId ?? 0);

  const cargoCompanyId = num(config.cargoCompanyId);
  if (!cargoCompanyId) {
    return {
      ok: false,
      sent: 0,
      message:
        "Trendyol kargo firması ID (cargoCompanyId) zorunlu. Entegrasyon ayarlarından girin.",
    };
  }

  const currencyType = config.currencyType?.trim() || "TRY";
  const defaultDimensionalWeight = num(config.dimensionalWeight) ?? 1;

  // Web sitesi ana kaynak: barkodu olmayan ürünlere SKU/slug'dan kararlı bir
  // barkod üret ve siteye kaydet (Trendyol barkod zorunlu). Böylece "tek seferlik
  // tam yükleme"de hiçbir ürün barkod eksikliğinden atlanmaz.
  if (siteId) {
    for (const p of products) {
      if (p.barcode?.trim()) continue;
      const generated = generateBarcode(p.sku, p.slug);
      if (!generated) continue;
      p.barcode = generated;
      try {
        await prisma.storeProduct.update({ where: { id: p.id }, data: { barcode: generated } });
      } catch {
        /* barkod çakışması vb. — bu ürünü atla */
      }
    }
  }

  const withBarcodeStock = products.filter((p) => p.barcode?.trim() && p.stockQty > 0);
  if (withBarcodeStock.length === 0) {
    const noStock = products.filter((p) => p.stockQty <= 0).length;
    return {
      ok: false,
      sent: 0,
      message: noStock
        ? `Gönderilecek ürün yok: stok > 0 olan yayın ürün gerekli. ${noStock} ürün stoksuz.`
        : "Gönderilecek ürün yok: barkod ve stok > 0 olan yayın ürün gerekli.",
    };
  }

  // Trendyol tek istekte max 1000 ürün kabul eder; güvenli üst sınır.
  const eligible = withBarcodeStock.slice(0, 1000);

  const listingStatuses = new Map<string, string>();
  if (siteId && marketplaceProductListingDb()) {
    const listings = await prisma.marketplaceProductListing.findMany({
      where: {
        siteId,
        platform: "trendyol",
        productId: { in: eligible.map((p) => p.id) },
      },
      select: { productId: true, listingStatus: true },
    });
    for (const l of listings) {
      listingStatuses.set(l.productId, l.listingStatus);
    }
  }

  const createItems: TrendyolProduct[] = [];
  const updateItems: TrendyolProductUpdate[] = [];
  const createProducts: SyncProductInput[] = [];
  const updateProducts: SyncProductInput[] = [];
  const skippedNoMapping: string[] = [];

  for (const p of eligible) {
    const mapped = siteId
      ? await resolveTrendyolCategoryBrand(siteId, p.categoryId, {
          categoryId: defaultCategoryId,
          brandId: defaultBrandId,
        })
      : { categoryId: defaultCategoryId, brandId: defaultBrandId };

    if (!mapped.categoryId || !mapped.brandId) {
      skippedNoMapping.push(p.title);
      continue;
    }

    const categoryAttributes = siteId ? await resolveTrendyolAttributes(siteId, p.categoryId) : [];
    const attributes = mergeTrendyolAttributes(
      categoryAttributes,
      parseProductAttributes(p.marketplaceAttributesJson, "trendyol"),
    );
    const base = buildTrendyolItemBase(p, mapped, config, attributes);
    const listingStatus = listingStatuses.get(p.id) ?? "none";
    const existsOnTrendyol = listingStatus !== "none";

    if (existsOnTrendyol) {
      updateItems.push(base);
      updateProducts.push(p);
    } else {
      const prices = toMarketplaceSyncPrices(p, "trendyol");
      createItems.push({
        ...base,
        quantity: Math.min(p.stockQty, 9999),
        listPrice: Number(minorToTry(prices.listPriceMinor)),
        salePrice: Number(minorToTry(prices.salePriceMinor)),
        cargoCompanyId,
        currencyType,
        dimensionalWeight: productDimensionalWeight(p, defaultDimensionalWeight),
      });
      createProducts.push(p);
    }
  }

  if (createItems.length === 0 && updateItems.length === 0) {
    const skippedNote = skippedNoMapping.length
      ? ` ${skippedNoMapping.length} ürünün kategorisi Trendyol'a eşlenmemiş (ör. "${skippedNoMapping[0]}"). Kategori eşlemesi tanımlayın veya varsayılan marka/kategori ID girin.`
      : " Varsayılan marka/kategori ID girin veya kategori eşlemesi tanımlayın.";
    return {
      ok: false,
      sent: 0,
      message: `Gönderilecek uygun ürün bulunamadı.${skippedNote}`,
    };
  }

  try {
    const messages: string[] = [];
    let totalSent = 0;
    let allOk = true;
    const CHUNK = 100;

    // Yeni ürünler — 100'lük gruplar halinde oluştur
    const createChunks = chunk(createItems, CHUNK);
    const createProdChunks = chunk(createProducts, CHUNK);
    let createSent = 0;
    let createFailedBatches = 0;
    for (let i = 0; i < createChunks.length; i++) {
      let r = await sendTrendyolProductBatch(creds, "POST", createChunks[i], createProdChunks[i], siteId);
      if (!r.ok && isDuplicateCreateError(r.message) && createProdChunks[i].length > 0) {
        const retryItems = createChunks[i].map((item) => {
          const { quantity: _q, listPrice: _l, salePrice: _s, cargoCompanyId: _c, currencyType: _ct, dimensionalWeight: _d, ...rest } = item;
          return rest;
        });
        r = await sendTrendyolProductBatch(creds, "PUT", retryItems, createProdChunks[i], siteId);
      }
      createSent += r.sent;
      if (!r.ok) {
        allOk = false;
        createFailedBatches++;
        if (i === 0) messages.push(r.message);
      }
    }
    if (createSent > 0) {
      messages.push(`${createSent} yeni ürün gönderildi${createFailedBatches ? ` (${createFailedBatches} grup hatalı)` : ""}`);
    }
    totalSent += createSent;

    // Var olan ürünler — 100'lük gruplar halinde güncelle
    const updateChunks = chunk(updateItems, CHUNK);
    const updateProdChunks = chunk(updateProducts, CHUNK);
    let updateSent = 0;
    for (let i = 0; i < updateChunks.length; i++) {
      const r = await sendTrendyolProductBatch(creds, "PUT", updateChunks[i], updateProdChunks[i], siteId);
      updateSent += r.sent;
      if (!r.ok) allOk = false;
    }
    if (updateSent > 0) messages.push(`${updateSent} ürün güncellendi`);
    totalSent += updateSent;

    // Trendyol PUT (ürün güncelleme) fiyat/stok kabul ETMEZ — bunlar ayrı
    // price-and-inventory endpoint'inden gider. Var olan ürünler güncellenirken
    // fiyat/stoğu da güncel tutmak için burada ayrıca gönderiyoruz.
    if (updateProducts.length > 0) {
      const invItems = updateProducts
        .filter((p) => p.barcode?.trim())
        .map((p) => {
          const prices = toMarketplaceSyncPrices(p, "trendyol");
          return {
            barcode: p.barcode!.trim(),
            quantity: Math.min(Math.max(0, p.stockQty), 9999),
            salePriceMinor: prices.salePriceMinor,
            listPriceMinor: prices.listPriceMinor,
          };
        });
      if (invItems.length > 0) {
        const inv = await syncTrendyolPriceAndInventory(creds, invItems);
        messages.push(inv.ok ? `Fiyat/stok: ${inv.sent} ürün güncellendi` : `Fiyat/stok hatası: ${inv.message}`);
        if (!inv.ok) allOk = false;
      }
    }

    const skipNote = skippedNoMapping.length
      ? ` · ${skippedNoMapping.length} ürün kategori eşlemesi olmadığı için atlandı`
      : "";

    return {
      ok: allOk,
      sent: totalSent,
      message: `${messages.join(" · ") || "İşlem tamamlandı"}${skipNote}`,
    };
  } catch (e) {
    return {
      ok: false,
      sent: 0,
      message: e instanceof Error ? e.message : "Trendyol bağlantı hatası",
    };
  }
}
