/** Mağaza ürünü ile pazaryeri listing'i arasındaki senkron durumu. */
export type MarketplaceSyncState = "not_listed" | "synced" | "stale" | "needs_attention";

export type ProductMarketplaceSyncRow = {
  platform: string;
  state: MarketplaceSyncState;
  listingStatus: string | null;
  lastError: string | null;
  syncedAt: string | null;
};

export type ProductMarketplaceSyncSummary = {
  productId: string;
  productUpdatedAt: string;
  platforms: ProductMarketplaceSyncRow[];
  stalePlatforms: string[];
  notListedPlatforms: string[];
  needsAttentionPlatforms: string[];
};

export type MarketplaceSyncTotals = {
  products: number;
  stale: number;
  notListed: number;
  needsAttention: number;
  synced: number;
};

const LISTED_STATUSES = new Set(["active", "pending", "exported", "inactive"]);

export function parseSyncedProductUpdatedAt(metaJson: string | null): Date | null {
  if (!metaJson) return null;
  try {
    const meta = JSON.parse(metaJson) as { syncedProductUpdatedAt?: string };
    if (!meta.syncedProductUpdatedAt) return null;
    const d = new Date(meta.syncedProductUpdatedAt);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** metaJson birleştirir; içerik gönderiminde syncedProductUpdatedAt yazar. */
export function mergeListingMetaJson(
  existing: string | null,
  patch: Record<string, unknown>,
  contentSyncedAtProductUpdatedAt?: Date,
): string {
  let meta: Record<string, unknown> = {};
  if (existing) {
    try {
      meta = JSON.parse(existing) as Record<string, unknown>;
    } catch {
      /* metaJson bozuk */
    }
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) meta[key] = value;
  }
  if (contentSyncedAtProductUpdatedAt) {
    meta.syncedProductUpdatedAt = contentSyncedAtProductUpdatedAt.toISOString();
  }
  return JSON.stringify(meta);
}

export function resolveListingSyncState(
  productUpdatedAt: Date,
  listing: { listingStatus: string; lastError: string | null; metaJson: string | null } | null,
): MarketplaceSyncState {
  if (!listing || listing.listingStatus === "none") return "not_listed";
  if (listing.listingStatus === "rejected" || listing.listingStatus === "error") {
    return "needs_attention";
  }
  if (!LISTED_STATUSES.has(listing.listingStatus)) return "not_listed";

  const syncedAt = parseSyncedProductUpdatedAt(listing.metaJson);
  if (!syncedAt) return "stale";
  if (productUpdatedAt.getTime() > syncedAt.getTime() + 1000) return "stale";
  return "synced";
}

export function marketplaceSyncStateLabel(state: MarketplaceSyncState): string {
  switch (state) {
    case "synced":
      return "Güncel";
    case "stale":
      return "Güncelleme bekliyor";
    case "needs_attention":
      return "Hata / dikkat";
    default:
      return "Pazaryerinde yok";
  }
}

export function marketplaceSyncStateClass(state: MarketplaceSyncState): string {
  switch (state) {
    case "synced":
      return "border-green-200 bg-green-50 text-green-800";
    case "stale":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "needs_attention":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
}

export function buildProductMarketplaceSyncSummary(input: {
  productId: string;
  productUpdatedAt: Date;
  listings: { platform: string; listingStatus: string; lastError: string | null; metaJson: string | null }[];
  activePlatforms: string[];
}): ProductMarketplaceSyncSummary {
  const listingByPlatform = new Map(input.listings.map((l) => [l.platform, l]));
  const platforms: ProductMarketplaceSyncRow[] = input.activePlatforms.map((platform) => {
    const listing = listingByPlatform.get(platform) ?? null;
    const state = resolveListingSyncState(input.productUpdatedAt, listing);
    const syncedAt = listing ? parseSyncedProductUpdatedAt(listing.metaJson)?.toISOString() ?? null : null;
    return {
      platform,
      state,
      listingStatus: listing?.listingStatus ?? null,
      lastError: listing?.lastError ?? null,
      syncedAt,
    };
  });

  return {
    productId: input.productId,
    productUpdatedAt: input.productUpdatedAt.toISOString(),
    platforms,
    stalePlatforms: platforms.filter((p) => p.state === "stale").map((p) => p.platform),
    notListedPlatforms: platforms.filter((p) => p.state === "not_listed").map((p) => p.platform),
    needsAttentionPlatforms: platforms.filter((p) => p.state === "needs_attention").map((p) => p.platform),
  };
}

export function summarizeMarketplaceSyncTotals(
  summaries: ProductMarketplaceSyncSummary[],
): MarketplaceSyncTotals {
  let stale = 0;
  let notListed = 0;
  let needsAttention = 0;
  let synced = 0;

  for (const s of summaries) {
    const states = s.platforms.map((p) => p.state);
    if (states.includes("needs_attention")) needsAttention++;
    else if (states.includes("stale")) stale++;
    else if (states.length > 0 && states.every((st) => st === "not_listed")) notListed++;
    else if (states.includes("not_listed")) notListed++;
    else if (states.length > 0 && states.every((st) => st === "synced")) synced++;
  }

  return { products: summaries.length, stale, notListed, needsAttention, synced };
}

export function productMatchesSyncFilter(
  summary: ProductMarketplaceSyncSummary | undefined,
  filter: "all" | "stale" | "not_listed" | "needs_attention",
): boolean {
  if (filter === "all") return true;
  if (!summary) return filter === "not_listed";
  const states = summary.platforms.map((p) => p.state);
  if (filter === "needs_attention") return states.includes("needs_attention");
  if (filter === "stale") return states.includes("stale");
  if (filter === "not_listed") return states.includes("not_listed");
  return true;
}
