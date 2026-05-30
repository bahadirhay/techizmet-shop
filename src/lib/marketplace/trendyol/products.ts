import type { MarketplaceCatalogFetchResult, MarketplaceCatalogItem } from "@/lib/marketplace/catalog-types";
import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { trendyolRequest } from "@/lib/marketplace/trendyol/client";

function mapTrendyolListingStatus(raw: Record<string, unknown>): MarketplaceCatalogItem["listingStatus"] {
  if (raw.rejected === true || (Array.isArray(raw.rejectReasonDetails) && raw.rejectReasonDetails.length > 0)) {
    return "rejected";
  }
  if (raw.blacklisted === true) return "inactive";
  if (raw.approved === true && raw.onSale === true) return "active";
  if (raw.approved === true) return "inactive";
  return "pending";
}

function parseTrendyolProduct(raw: Record<string, unknown>): MarketplaceCatalogItem | null {
  const barcode = String(raw.barcode ?? "").trim();
  const sku = String(raw.stockCode ?? raw.productMainId ?? "").trim();
  if (!barcode && !sku) return null;

  return {
    barcode: barcode || undefined,
    sku: sku || undefined,
    title: String(raw.title ?? "").trim() || undefined,
    listingStatus: mapTrendyolListingStatus(raw),
    meta: {
      productMainId: raw.productMainId,
      quantity: raw.quantity,
      salePrice: raw.salePrice,
      listPrice: raw.listPrice,
      approved: raw.approved,
      onSale: raw.onSale,
    },
  };
}

function extractTrendyolPage(json: unknown): { items: Record<string, unknown>[]; totalPages: number; page: number } {
  if (!json || typeof json !== "object") return { items: [], totalPages: 0, page: 0 };
  const obj = json as Record<string, unknown>;
  const items =
    (Array.isArray(obj.content) ? obj.content : null) ??
    (Array.isArray(obj.products) ? obj.products : null) ??
    [];
  const totalPages = Number(obj.totalPages ?? 1);
  const page = Number(obj.page ?? 0);
  return { items: items as Record<string, unknown>[], totalPages, page };
}

export async function fetchTrendyolCatalog(
  creds: TrendyolCredentials,
  options?: { maxPages?: number },
): Promise<MarketplaceCatalogFetchResult> {
  const maxPages = options?.maxPages ?? 50;
  const catalog: MarketplaceCatalogItem[] = [];
  const errors: string[] = [];
  let page = 0;

  while (page < maxPages) {
    const path = `/integration/product/sellers/${creds.sellerId}/products?page=${page}&size=200`;
    const res = await trendyolRequest(creds, path);

    if (!res.ok) {
      errors.push(`HTTP ${res.status}: ${res.text.slice(0, 200)}`);
      break;
    }

    const { items, totalPages } = extractTrendyolPage(res.json);
    if (!items.length) break;

    for (const raw of items) {
      const parsed = parseTrendyolProduct(raw);
      if (parsed) catalog.push(parsed);
    }

    page++;
    if (page >= totalPages) break;
  }

  return {
    ok: catalog.length > 0 || errors.length === 0,
    items: catalog,
    message: `${catalog.length} Trendyol ürünü okundu`,
    errors,
  };
}
