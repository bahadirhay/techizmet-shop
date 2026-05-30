import type { MarketplaceCatalogFetchResult, MarketplaceCatalogItem } from "@/lib/marketplace/catalog-types";

function parseHbListingStatus(raw: Record<string, unknown>): MarketplaceCatalogItem["listingStatus"] {
  const status = String(raw.status ?? raw.listingStatus ?? raw.productStatus ?? "").toLowerCase();
  if (status.includes("reject") || status.includes("red")) return "rejected";
  if (status.includes("passive") || status.includes("inactive") || status.includes("closed")) return "inactive";
  if (status.includes("active") || status.includes("on_sale") || status.includes("salable")) return "active";
  if (status.includes("pending") || status.includes("wait")) return "pending";
  return "active";
}

function parseHbProduct(raw: Record<string, unknown>): MarketplaceCatalogItem | null {
  const barcode = String(raw.barcode ?? raw.Barcode ?? "").trim();
  const sku = String(
    raw.merchantSku ?? raw.MerchantSku ?? raw.hepsiburadaSku ?? raw.sku ?? raw.stockCode ?? "",
  ).trim();
  if (!barcode && !sku) return null;

  return {
    barcode: barcode || undefined,
    sku: sku || undefined,
    title: String(raw.productName ?? raw.title ?? raw.name ?? "").trim() || undefined,
    listingStatus: parseHbListingStatus(raw),
    meta: {
      hbSku: raw.hepsiburadaSku ?? raw.HbSku,
      price: raw.price ?? raw.salePrice,
      stock: raw.stock ?? raw.availableStock,
      status: raw.status ?? raw.listingStatus,
    },
  };
}

function extractHbItems(json: unknown): Record<string, unknown>[] {
  if (!json) return [];
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  if (typeof json !== "object") return [];

  const obj = json as Record<string, unknown>;
  const candidates = [
    obj.data,
    obj.products,
    obj.listings,
    obj.items,
    obj.content,
    (obj.data as Record<string, unknown> | undefined)?.products,
    (obj.data as Record<string, unknown> | undefined)?.listings,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c as Record<string, unknown>[];
  }
  return [];
}

async function hbCatalogRequest(
  baseUrl: string,
  merchantId: string,
  apiKey: string,
  apiSecret: string,
  path: string,
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "User-Agent": `${merchantId} - TechizmetShop`,
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

export async function fetchHepsiburadaCatalog(
  config: Record<string, string>,
  options?: { maxPages?: number },
): Promise<MarketplaceCatalogFetchResult> {
  const merchant = config.sellerId?.trim() || config.merchantId?.trim();
  const apiKey = config.apiKey?.trim();
  const apiSecret = config.apiSecret?.trim() || config.secretKey?.trim();
  const baseUrl =
    config.hepsiburadaBaseUrl?.trim() ||
    (config.testMode === "true" ? "https://mpop-sit.hepsiburada.com" : "https://mpop.hepsiburada.com");

  if (!merchant || !apiKey || !apiSecret) {
    return {
      ok: false,
      items: [],
      message: "Hepsiburada merchant ID, API Key ve Secret zorunlu",
      errors: [],
    };
  }

  const maxPages = options?.maxPages ?? 50;
  const catalog: MarketplaceCatalogItem[] = [];
  const errors: string[] = [];
  const pageSize = 100;

  for (let page = 0; page < maxPages; page++) {
    const offset = page * pageSize;
    const paths = [
      `/product/api/products/all-products-of-merchant/${merchant}/${offset}/${pageSize}`,
      `/product/api/products/all-products-of-merchant/${merchant}?offset=${offset}&limit=${pageSize}`,
      `/product/api/products/get-all-products-of-merchant/${merchant}/${page}/${pageSize}`,
    ];

    let pageItems: Record<string, unknown>[] = [];
    let pageOk = false;

    for (const path of paths) {
      const res = await hbCatalogRequest(baseUrl, merchant, apiKey, apiSecret, path);
      if (!res.ok) {
        if (page === 0) errors.push(`${path} → HTTP ${res.status}`);
        continue;
      }
      pageItems = extractHbItems(res.json);
      if (pageItems.length) {
        pageOk = true;
        break;
      }
    }

    if (!pageOk || !pageItems.length) break;

    for (const raw of pageItems) {
      const parsed = parseHbProduct(raw);
      if (parsed) catalog.push(parsed);
    }

    if (pageItems.length < pageSize) break;
  }

  return {
    ok: catalog.length > 0 || (errors.length === 0 && catalog.length === 0),
    items: catalog,
    message: `${catalog.length} Hepsiburada ürünü okundu`,
    errors,
  };
}
