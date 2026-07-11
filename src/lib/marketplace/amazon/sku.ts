import {
  amazonSpApiRequest,
  type AmazonSpApiCredentials,
} from "@/lib/marketplace/amazon/client";

/** Amazon seller SKU kaynağı: listing metaJson → ürün SKU → slug/barkod → id. */
export type AmazonSkuProduct = {
  sku: string | null;
  slug: string;
  barcode: string | null;
  id: string;
};

export function parseAmazonListingMeta(metaJson: string | null): { sku?: string; asin?: string } {
  if (!metaJson) return {};
  try {
    return JSON.parse(metaJson) as { sku?: string; asin?: string };
  } catch {
    return {};
  }
}

export function resolveAmazonListingSku(
  metaJson: string | null,
  product: AmazonSkuProduct,
): string {
  const meta = parseAmazonListingMeta(metaJson);
  if (meta.sku?.trim()) return meta.sku.trim();
  return (product.sku?.trim() || product.slug?.trim() || product.barcode?.trim() || product.id).slice(
    0,
    40,
  );
}

/** ASIN ile Seller Central'daki gerçek seller SKU'yu bulur (ör. PKT02DVDN02). */
export async function findAmazonSkuByAsin(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  marketplaceId: string,
  asin: string,
): Promise<string | null> {
  const normalized = asin.trim().toUpperCase();
  if (!normalized) return null;

  const qs = new URLSearchParams({
    marketplaceIds: marketplaceId,
    identifiers: normalized,
    identifiersType: "ASIN",
    includedData: "summaries",
    pageSize: "5",
  });
  const res = await amazonSpApiRequest(
    creds,
    accessToken,
    `/listings/2021-08-01/items/${encodeURIComponent(creds.sellerId)}?${qs}`,
  );
  if (!res.ok) return null;

  const payload = res.json as { items?: Record<string, unknown>[] } | null;
  for (const raw of payload?.items ?? []) {
    const sku = String(raw.sku ?? "").trim();
    if (!sku) continue;
    const summaries = (raw.summaries as Record<string, unknown>[]) ?? [];
    const summaryAsin = String(summaries[0]?.asin ?? "").trim().toUpperCase();
    if (!summaryAsin || summaryAsin === normalized) return sku;
  }
  return null;
}

async function amazonSkuListingExists(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  marketplaceId: string,
  sku: string,
): Promise<boolean> {
  const qs = new URLSearchParams({ marketplaceIds: marketplaceId });
  const res = await amazonSpApiRequest(
    creds,
    accessToken,
    `/listings/2021-08-01/items/${encodeURIComponent(creds.sellerId)}/${encodeURIComponent(sku)}?${qs}`,
  );
  return res.ok && res.status !== 404;
}

/**
 * Teklif/doğrulama için Amazon'daki gerçek SKU'yu çözer.
 * metaJson'daki eski SKU (PKT02DVDN) Seller Central'da yoksa ASIN ile güncel SKU bulunur.
 */
export async function resolveAmazonSkuForSync(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  marketplaceId: string,
  metaJson: string | null,
  product: AmazonSkuProduct,
  listingBarcode?: string | null,
): Promise<string> {
  const meta = parseAmazonListingMeta(metaJson);
  const candidates = [
    meta.sku?.trim(),
    product.sku?.trim(),
    resolveAmazonListingSku(metaJson, product),
  ].filter(Boolean) as string[];

  for (const sku of [...new Set(candidates)]) {
    if (await amazonSkuListingExists(creds, accessToken, marketplaceId, sku)) return sku;
  }

  const asin = meta.asin?.trim() || listingBarcode?.trim();
  if (asin) {
    const byAsin = await findAmazonSkuByAsin(creds, accessToken, marketplaceId, asin);
    if (byAsin) return byAsin;
  }

  return candidates[0] ?? resolveAmazonListingSku(metaJson, product);
}
