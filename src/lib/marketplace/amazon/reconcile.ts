import { prisma } from "@/lib/prisma";
import {
  amazonSpApiRequest,
  getAmazonAccessToken,
  resolveAmazonMarketplaceId,
  type AmazonSpApiCredentials,
} from "@/lib/marketplace/amazon/client";
import { upsertProductMarketplaceListing } from "@/lib/marketplace/catalog-import";
import { formatAmazonListingError } from "@/lib/marketplace/amazon/errors";

function resolveListingSku(
  metaJson: string | null,
  product: { sku: string | null; slug: string; barcode: string | null; id: string },
): string {
  if (metaJson) {
    try {
      const meta = JSON.parse(metaJson) as { sku?: string };
      if (meta.sku?.trim()) return meta.sku.trim();
    } catch {
      /* metaJson bozuk */
    }
  }
  return (product.sku?.trim() || product.slug?.trim() || product.barcode?.trim() || product.id).slice(
    0,
    40,
  );
}

function mergeListingMeta(existing: string | null, sku: string, asin?: string): string {
  let meta: Record<string, unknown> = {};
  if (existing) {
    try {
      meta = JSON.parse(existing) as Record<string, unknown>;
    } catch {
      /* metaJson bozuk */
    }
  }
  meta.sku = sku;
  if (asin) meta.asin = asin;
  return JSON.stringify(meta);
}

function mapAmazonSummaryStatus(raw: Record<string, unknown> | undefined): "active" | "inactive" | "pending" {
  const status = String(raw?.status ?? "").toUpperCase();
  if (status.includes("INACTIVE") || status.includes("SUPPRESSED")) return "inactive";
  if (status.includes("BUYABLE")) return "active";
  if (status.includes("DISCOVERABLE") || status.includes("ACTIVE")) return "active";
  if (status.includes("INCOMPLETE")) return "pending";
  return "pending";
}

function extractAmazonErrorMessages(
  issues?: { message?: string; severity?: string }[],
): string {
  return (
    issues
      ?.filter((x) => (x.severity ?? "ERROR").toUpperCase() === "ERROR")
      .map((x) => x.message)
      .filter(Boolean)
      .map((m) => formatAmazonListingError(String(m)))
      .join("; ") ?? ""
  );
}

async function fetchAmazonListingStatus(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  marketplaceId: string,
  sku: string,
): Promise<{
  found: boolean;
  listingStatus: "active" | "inactive" | "pending" | "rejected";
  lastError: string | null;
  asin?: string;
}> {
  const qs = new URLSearchParams({
    marketplaceIds: marketplaceId,
    includedData: "summaries,issues",
  });
  const res = await amazonSpApiRequest(
    creds,
    accessToken,
    `/listings/2021-08-01/items/${encodeURIComponent(creds.sellerId)}/${encodeURIComponent(sku)}?${qs}`,
  );

  if (res.status === 404) {
    return { found: false, listingStatus: "rejected", lastError: "Amazon'da listing bulunamadı (SKU yok)" };
  }
  if (!res.ok) {
    return {
      found: false,
      listingStatus: "rejected",
      lastError: `HTTP ${res.status}: ${res.text.slice(0, 160)}`,
    };
  }

  const json = res.json as {
    summaries?: Record<string, unknown>[];
    issues?: { message?: string; severity?: string }[];
  } | null;
  const errors = extractAmazonErrorMessages(json?.issues);
  const summary = json?.summaries?.[0];
  const asin = summary?.asin ? String(summary.asin) : undefined;
  const summaryStatus = mapAmazonSummaryStatus(summary);

  // ASIN varsa ürün Amazon kataloğunda — eski gönderim hatası olsa bile "reddedildi" değil
  if (asin) {
    let listingStatus: "active" | "inactive" | "pending" | "rejected" = summaryStatus;
    if (errors && listingStatus === "active") listingStatus = "pending";
    if (errors && listingStatus !== "inactive") listingStatus = "pending";
    return {
      found: true,
      listingStatus,
      lastError: errors || null,
      asin,
    };
  }

  if (errors) {
    return { found: true, listingStatus: "rejected", lastError: errors };
  }

  return {
    found: true,
    listingStatus: summaryStatus,
    lastError: null,
    asin,
  };
}

/** Gönderilmiş Amazon ilanlarının durumunu SKU üzerinden doğrular ve DB'yi günceller. */
export async function reconcileAmazonListings(
  siteId: string,
  creds: AmazonSpApiCredentials,
  config: Record<string, string>,
  options?: { productIds?: string[] },
): Promise<{
  ok: boolean;
  message: string;
  checked: number;
  active: number;
  pending: number;
  rejected: number;
  notFound: number;
}> {
  const token = await getAmazonAccessToken(creds);
  if (!token.accessToken) {
    return {
      ok: false,
      message: token.error ?? "Amazon token alınamadı",
      checked: 0,
      active: 0,
      pending: 0,
      rejected: 0,
      notFound: 0,
    };
  }

  const marketplaceId = resolveAmazonMarketplaceId(config);
  const productIds = options?.productIds?.filter(Boolean);
  const listings = await prisma.marketplaceProductListing.findMany({
    where: {
      siteId,
      platform: "amazon_tr",
      listingStatus: { in: ["pending", "active", "inactive", "rejected", "exported", "error"] },
      ...(productIds?.length ? { productId: { in: productIds } } : {}),
    },
    include: {
      product: { select: { id: true, sku: true, slug: true, barcode: true } },
    },
    take: 200,
  });

  if (listings.length === 0) {
    return {
      ok: true,
      message: "Doğrulanacak Amazon ilanı yok — önce ürün gönderin",
      checked: 0,
      active: 0,
      pending: 0,
      rejected: 0,
      notFound: 0,
    };
  }

  let active = 0;
  let pending = 0;
  let rejected = 0;
  let notFound = 0;

  for (const listing of listings) {
    const sku = resolveListingSku(listing.metaJson, listing.product);
    const result = await fetchAmazonListingStatus(creds, token.accessToken, marketplaceId, sku);

    if (!result.found && result.lastError?.includes("bulunamadı")) notFound++;
    else if (result.listingStatus === "active") active++;
    else if (result.listingStatus === "pending" || result.listingStatus === "inactive") pending++;
    else rejected++;

    await upsertProductMarketplaceListing(siteId, listing.productId, "amazon_tr", {
      barcode: result.asin ?? listing.barcode,
      listingStatus: result.listingStatus,
      lastError: result.lastError,
      metaJson: mergeListingMeta(listing.metaJson, sku, result.asin),
    });
  }

  return {
    ok: true,
    message:
      `${listings.length} ilan Amazon'dan güncellendi: ${active} yayında, ${pending} işlemde/eksik, ` +
      `${rejected} reddedildi, ${notFound} bulunamadı.`,
    checked: listings.length,
    active,
    pending,
    rejected,
    notFound,
  };
}
