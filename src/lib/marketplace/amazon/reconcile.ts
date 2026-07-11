import { prisma } from "@/lib/prisma";
import {
  amazonSpApiRequest,
  getAmazonAccessToken,
  resolveAmazonMarketplaceId,
  type AmazonSpApiCredentials,
} from "@/lib/marketplace/amazon/client";
import { upsertProductMarketplaceListing } from "@/lib/marketplace/catalog-import";
import { formatAmazonListingError } from "@/lib/marketplace/amazon/errors";
import { resolveAmazonSkuForSync } from "@/lib/marketplace/amazon/sku";
import { syncAmazonOffersWithRetry, type AmazonInventoryItem } from "@/lib/marketplace/amazon/inventory";
import { toMarketplaceSyncPrices } from "@/lib/marketplace/product-prices";

function normalizeSummaryStatus(raw: Record<string, unknown> | undefined): string {
  const s = raw?.status;
  if (Array.isArray(s)) return s.map((x) => String(x).toUpperCase()).join(" ");
  return String(s ?? "").toUpperCase();
}

function mapAmazonSummaryStatus(raw: Record<string, unknown> | undefined): "active" | "inactive" | "pending" {
  const status = normalizeSummaryStatus(raw);
  if (status.includes("INACTIVE") || status.includes("SUPPRESSED")) return "inactive";
  // BUYABLE = satışa açık — issues listesindeki eski uyarılar durumu düşürmez
  if (status.includes("BUYABLE")) return "active";
  if (status.includes("DISCOVERABLE")) return "pending";
  if (status.includes("ACTIVE")) return "active";
  if (status.includes("INCOMPLETE")) return "pending";
  return "pending";
}

function isOfferOnlyIssueMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("teklif") ||
    m.includes("offer") ||
    m.includes("fiyat") ||
    m.includes("price") ||
    m.includes("stok") ||
    m.includes("quantity") ||
    m.includes("hediye") ||
    m.includes("gift")
  );
}

function resolveListingErrors(
  summaryStatus: "active" | "inactive" | "pending",
  rawIssues?: { message?: string; severity?: string }[],
): string | null {
  if (summaryStatus === "active") return null;

  const errors = extractAmazonErrorMessages(rawIssues);
  if (!errors) return null;

  // Katalogda görünür ama teklif eksik — eski görsel/marka uyarılarını gösterme
  if (summaryStatus === "pending") {
    const parts = errors.split("; ").filter(Boolean);
    const offerParts = parts.filter(isOfferOnlyIssueMessage);
    if (offerParts.length > 0) return offerParts.join("; ");
    if (parts.some((p) => p.includes("Görsel Amazon"))) {
      return "Amazon'da teklif/stok bilgisi eksik olabilir — Seller Central veya «Stok & fiyat güncelle» kullanın.";
    }
  }

  return errors;
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
  const summary = json?.summaries?.[0];
  const asin = summary?.asin ? String(summary.asin) : undefined;
  const summaryStatus = mapAmazonSummaryStatus(summary);
  const lastError = resolveListingErrors(summaryStatus, json?.issues);

  if (asin) {
    return {
      found: true,
      listingStatus: summaryStatus,
      lastError,
      asin,
    };
  }

  const errors = extractAmazonErrorMessages(json?.issues);
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
  options?: { productIds?: string[]; pushPendingOffers?: boolean },
): Promise<{
  ok: boolean;
  message: string;
  checked: number;
  active: number;
  pending: number;
  rejected: number;
  notFound: number;
  offersPushed?: number;
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
      offersPushed: 0,
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
      offersPushed: 0,
    };
  }

  const pushPendingOffers = options?.pushPendingOffers ?? false;
  const productRows = pushPendingOffers
    ? await prisma.storeProduct.findMany({
        where: { siteId, id: { in: listings.map((l) => l.productId) } },
        select: {
          id: true,
          sku: true,
          slug: true,
          barcode: true,
          stockQty: true,
          priceMinor: true,
          compareAtMinor: true,
          marketplacePricesJson: true,
          marketplaceMarkupPercentJson: true,
        },
      })
    : [];
  const productById = new Map(productRows.map((p) => [p.id, p]));
  const offerQueue: AmazonInventoryItem[] = [];

  let active = 0;
  let pending = 0;
  let rejected = 0;
  let notFound = 0;

  for (const listing of listings) {
    const sku = await resolveAmazonSkuForSync(
      creds,
      token.accessToken,
      marketplaceId,
      listing.metaJson,
      listing.product,
      listing.barcode,
    );
    const result = await fetchAmazonListingStatus(creds, token.accessToken, marketplaceId, sku);

    if (!result.found && result.lastError?.includes("bulunamadı")) notFound++;
    else if (result.listingStatus === "active") active++;
    else if (result.listingStatus === "pending" || result.listingStatus === "inactive") pending++;
    else rejected++;

    await upsertProductMarketplaceListing(siteId, listing.productId, "amazon_tr", {
      barcode: result.asin ?? listing.barcode,
      listingStatus: result.listingStatus,
      lastError: result.lastError,
      metaPatch: { sku, ...(result.asin ? { asin: result.asin } : {}) },
    });

    if (pushPendingOffers && result.asin && result.listingStatus !== "active") {
      const product = productById.get(listing.productId);
      if (product) {
        const prices = toMarketplaceSyncPrices(product, "amazon_tr");
        offerQueue.push({
          sku,
          quantity: product.stockQty,
          salePriceMinor: prices.salePriceMinor,
          listPriceMinor: prices.listPriceMinor,
        });
      }
    }
  }

  let offersPushed = 0;
  if (offerQueue.length > 0) {
    const offerResult = await syncAmazonOffersWithRetry(
      creds,
      token.accessToken,
      marketplaceId,
      offerQueue,
      config,
    );
    offersPushed = offerResult.sent;
  }

  const offerNote = offersPushed > 0 ? ` · ${offersPushed} teklif/stok gönderildi` : "";

  return {
    ok: true,
    message:
      `${listings.length} ilan Amazon'dan güncellendi: ${active} yayında, ${pending} işlemde/eksik, ` +
      `${rejected} reddedildi, ${notFound} bulunamadı${offerNote}.`,
    checked: listings.length,
    active,
    pending,
    rejected,
    notFound,
    offersPushed,
  };
}
