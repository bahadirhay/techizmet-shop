import type { MarketplaceCatalogFetchResult, MarketplaceCatalogItem } from "@/lib/marketplace/catalog-types";
import type { AmazonSpApiCredentials } from "@/lib/marketplace/amazon/client";
import { amazonSpApiRequest } from "@/lib/marketplace/amazon/client";

const DEFAULT_MARKETPLACE_ID = "A33AVAJ2PDY3EV";

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
      errors.push(`HTTP ${res.status}: ${res.text.slice(0, 200)}`);
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
