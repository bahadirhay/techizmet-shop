import { minorToTry } from "@/lib/admin/money";
import { toMarketplaceSyncPrices } from "@/lib/marketplace/product-prices";
import { resolveTrendyolCategoryBrand } from "@/lib/marketplace/category-mapping";
import { marketplaceProductListingDb } from "@/lib/marketplace/prisma-marketplace";
import { parseTrendyolConfig, trendyolLegacyProductBase } from "@/lib/marketplace/trendyol/client";
import { trendyolAuthHeaders } from "@/lib/marketplace/trendyol/headers";

type TrendyolProduct = {
  barcode: string;
  title: string;
  productMainId: string;
  brandId: number;
  categoryId: number;
  quantity: number;
  listPrice: number;
  salePrice: number;
  description?: string;
  images?: { url: string }[];
};

export type TrendyolSyncResult = {
  ok: boolean;
  sent: number;
  message: string;
  httpStatus?: number;
};

/** Trendyol Supplier API — ürün aktarımı (v2) */
export async function syncProductsToTrendyol(
  products: {
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
  }[],
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

    const prices = toMarketplaceSyncPrices(p, "trendyol");
    const list = Number(minorToTry(prices.listPriceMinor));
    const sale = Number(minorToTry(prices.salePriceMinor));
    const imageUrls = [
      ...(p.imageUrl ? [p.imageUrl] : []),
      ...(p.images?.map((i) => i.url).filter(Boolean) ?? []),
    ].slice(0, 8);

    items.push({
      barcode: p.barcode!.trim(),
      title: p.title.slice(0, 100),
      productMainId: p.sku?.trim() || p.slug,
      brandId: mapped.brandId,
      categoryId: mapped.categoryId,
      quantity: Math.min(p.stockQty, 9999),
      listPrice: list,
      salePrice: sale,
      description: (p.description ?? "").slice(0, 3000) || undefined,
      images: imageUrls.length ? imageUrls.map((url) => ({ url })) : undefined,
    });
  }

  const url = `${trendyolLegacyProductBase(creds)}/sapigw/suppliers/${creds.sellerId}/v2/products`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: trendyolAuthHeaders(creds),
      body: JSON.stringify({ items }),
    });
    const text = await res.text();
    let detail = text.slice(0, 500);
    try {
      const j = JSON.parse(text) as { errors?: { message?: string }[]; batchRequestId?: string };
      if (j.batchRequestId) detail = `batchRequestId: ${j.batchRequestId}`;
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

    if (siteId) {
      const listingDb = marketplaceProductListingDb();
      if (listingDb) {
        const now = new Date();
        for (const p of eligible) {
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
              barcode: p.barcode?.trim() ?? null,
              listingStatus: "pending",
              lastSyncAt: now,
            },
            update: {
              barcode: p.barcode?.trim() ?? null,
              listingStatus: "pending",
              lastSyncAt: now,
              lastError: null,
            },
          });
        }
      }
    }

    return {
      ok: true,
      sent: items.length,
      message: `${items.length} ürün Trendyol kuyruğuna gönderildi. ${detail}`,
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
