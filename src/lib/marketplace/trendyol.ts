import { minorToTry } from "@/lib/admin/money";
import { toMarketplaceSyncPrices } from "@/lib/marketplace/product-prices";
import { resolveTrendyolCategoryBrand } from "@/lib/marketplace/category-mapping";
import { resolveTrendyolAttributes } from "@/lib/marketplace/attribute-mapping";
import type { TrendyolPayloadAttribute } from "@/lib/marketplace/attribute-mapping";
import { marketplaceProductListingDb } from "@/lib/marketplace/prisma-marketplace";
import { buildPlatformListingTitle } from "@/lib/marketplace/title-rules";
import { parseTrendyolConfig, trendyolApiBase } from "@/lib/marketplace/trendyol/client";
import { trendyolAuthHeaders } from "@/lib/marketplace/trendyol/headers";
import { checkTrendyolBatchRequest } from "@/lib/marketplace/trendyol/categories";

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

function productDimensionalWeight(p: SyncProductInput, fallback: number): number {
  if (p.desi != null && p.desi > 0) return p.desi;
  if (p.weightGrams != null && p.weightGrams > 0) return Math.max(1, Math.ceil(p.weightGrams / 1000));
  return fallback;
}

/** Trendyol Supplier API — ürün aktarımı (v2) */
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

  if (!defaultBrandId || !defaultCategoryId) {
    return {
      ok: false,
      sent: 0,
      message:
        "Trendyol varsayılan marka/kategori ID girin veya kategori eşlemesi tanımlayın.",
    };
  }

  const cargoCompanyId = num(config.cargoCompanyId);
  if (!cargoCompanyId) {
    return {
      ok: false,
      sent: 0,
      message:
        "Trendyol kargo firması ID (cargoCompanyId) zorunlu. Entegrasyon ayarlarından girin.",
    };
  }

  const shipmentAddressId = num(config.shipmentAddressId);
  const returningAddressId = num(config.returningAddressId);
  const deliveryDuration = num(config.deliveryDuration);
  const defaultVatRate = Number(config.vatRate ?? config.defaultVatRate ?? "");
  const currencyType = config.currencyType?.trim() || "TRY";
  const defaultDimensionalWeight = num(config.dimensionalWeight) ?? 1;

  const eligible = products.filter((p) => p.barcode?.trim() && p.stockQty > 0).slice(0, 50);
  if (eligible.length === 0) {
    return {
      ok: false,
      sent: 0,
      message: "Gönderilecek ürün yok: barkod ve stok > 0 olan yayın ürün gerekli.",
    };
  }

  const items: TrendyolProduct[] = [];
  for (const p of eligible) {
    const mapped = siteId
      ? await resolveTrendyolCategoryBrand(siteId, p.categoryId, {
          categoryId: defaultCategoryId,
          brandId: defaultBrandId,
        })
      : { categoryId: defaultCategoryId, brandId: defaultBrandId };

    const attributes = siteId ? await resolveTrendyolAttributes(siteId, p.categoryId) : [];

    const prices = toMarketplaceSyncPrices(p, "trendyol");
    const list = Number(minorToTry(prices.listPriceMinor));
    const sale = Number(minorToTry(prices.salePriceMinor));
    const imageUrls = [
      ...(p.imageUrl ? [p.imageUrl] : []),
      ...(p.images?.map((i) => i.url).filter(Boolean) ?? []),
    ].slice(0, 8);

    const vatRate =
      p.vatRate != null && p.vatRate >= 0
        ? p.vatRate
        : Number.isFinite(defaultVatRate) && defaultVatRate >= 0
          ? defaultVatRate
          : 20;

    items.push({
      barcode: p.barcode!.trim(),
      title: buildPlatformListingTitle("trendyol", p.title, p.brand?.name ?? undefined),
      productMainId: p.sku?.trim() || p.slug,
      stockCode: p.sku?.trim() || p.slug,
      brandId: mapped.brandId,
      categoryId: mapped.categoryId,
      quantity: Math.min(p.stockQty, 9999),
      listPrice: list,
      salePrice: sale,
      vatRate,
      cargoCompanyId,
      currencyType,
      dimensionalWeight: productDimensionalWeight(p, defaultDimensionalWeight),
      deliveryOption: deliveryDuration ? { deliveryDuration } : undefined,
      shipmentAddressId,
      returningAddressId,
      description: (p.description ?? "").slice(0, 3000) || undefined,
      images: imageUrls.length ? imageUrls.map((url) => ({ url })) : undefined,
      attributes: attributes.length ? attributes : undefined,
    });
  }

  const url = `${trendyolApiBase(creds)}/integration/product/sellers/${creds.sellerId}/products`;

  try {
    const res = await fetch(url, {
      method: "POST",
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
      };
    }

    // Batch sonucunu sorgula (kabul/red) — kısa süre bekleyerek birkaç kez dene
    const batchByBarcode = new Map<string, { status: string; error: string | null }>();
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
    }

    if (siteId) {
      const listingDb = marketplaceProductListingDb();
      if (listingDb) {
        const now = new Date();
        const meta = batchRequestId ? JSON.stringify({ batchRequestId }) : null;
        for (const p of eligible) {
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
    return {
      ok: failedCount === 0,
      sent: items.length,
      message: `${items.length} ürün Trendyol'a gönderildi. ${detail}${batchSummary}`,
      httpStatus: res.status,
    };
  } catch (e) {
    return {
      ok: false,
      sent: 0,
      message: e instanceof Error ? e.message : "Trendyol bağlantı hatası",
    };
  }
}
