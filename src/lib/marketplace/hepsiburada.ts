import { minorToTry } from "@/lib/admin/money";
import { upsertProductMarketplaceListing } from "@/lib/marketplace/catalog-import";
import { buildPlatformListingTitle } from "@/lib/marketplace/title-rules";

type HbFastListingItem = {
  merchant: string;
  merchantSku: string;
  productName: string;
  barcode?: string;
  stock?: string;
  price?: string;
};

export type HepsiburadaSyncResult = {
  ok: boolean;
  sent: number;
  message: string;
  httpStatus?: number;
};

/** Hepsiburada Hızlı Ürün Yükleme — fastlisting */
export async function syncProductsToHepsiburada(
  products: {
    id: string;
    slug: string;
    title: string;
    barcode: string | null;
    sku: string | null;
    priceMinor: number;
    stockQty: number;
    updatedAt?: Date;
    brand?: { name: string } | null;
  }[],
  config: Record<string, string>,
  options?: { includeZeroStock?: boolean; siteId?: string },
): Promise<HepsiburadaSyncResult> {
  const merchant = config.sellerId?.trim() || config.merchantId?.trim();
  const apiKey = config.apiKey?.trim();
  const apiSecret = config.apiSecret?.trim() || config.secretKey?.trim();
  const baseUrl =
    config.hepsiburadaBaseUrl?.trim() ||
    (config.testMode === "true" ? "https://mpop-sit.hepsiburada.com" : "https://mpop.hepsiburada.com");

  if (!merchant || !apiKey || !apiSecret) {
    return { ok: false, sent: 0, message: "Satıcı (merchant) ID, API Key ve API Secret zorunlu." };
  }

  const eligible = products
    .filter((p) => (p.sku?.trim() || p.slug) && (options?.includeZeroStock || p.stockQty > 0))
    .slice(0, 100);

  if (eligible.length === 0) {
    return {
      ok: false,
      sent: 0,
      message: "Gönderilecek ürün yok: SKU ve stok > 0 olan yayın ürün gerekli.",
    };
  }

  const items: HbFastListingItem[] = eligible.map((p) => ({
    merchant,
    merchantSku: (p.sku?.trim() || p.slug).slice(0, 64),
    productName: buildPlatformListingTitle("hepsiburada", p.title, p.brand?.name ?? undefined),
    barcode: p.barcode?.trim() || undefined,
    stock: String(Math.min(p.stockQty, 9999)),
    price: minorToTry(p.priceMinor),
  }));

  const url = `${baseUrl.replace(/\/$/, "")}/product/api/products/fastlisting`;
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": `${merchant} - TechizmetShop`,
      },
      body: JSON.stringify(items),
    });
    const text = await res.text();
    let detail = text.slice(0, 500);
    try {
      const j = JSON.parse(text) as {
        message?: string;
        errorMessage?: string;
        trackingId?: string;
      };
      if (j.trackingId) detail = `trackingId: ${j.trackingId}`;
      if (j.message) detail = j.message;
      if (j.errorMessage) detail = j.errorMessage;
    } catch {
      /* raw */
    }

    if (!res.ok) {
      return {
        ok: false,
        sent: 0,
        message: `Hepsiburada HTTP ${res.status}: ${detail}`,
        httpStatus: res.status,
      };
    }

    if (options?.siteId) {
      for (const p of eligible) {
        await upsertProductMarketplaceListing(options.siteId, p.id, "hepsiburada", {
          barcode: p.barcode?.trim() ?? null,
          listingStatus: "pending",
          contentSyncedAt: p.updatedAt,
        });
      }
    }

    return {
      ok: true,
      sent: items.length,
      message: `${items.length} ürün Hepsiburada fastlisting kuyruğuna gönderildi. ${detail}`,
      httpStatus: res.status,
    };
  } catch (e) {
    return {
      ok: false,
      sent: 0,
      message: e instanceof Error ? e.message : "Hepsiburada bağlantı hatası",
    };
  }
}
