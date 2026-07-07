export type MarketplaceCatalogItem = {
  barcode?: string;
  sku?: string;
  title?: string;
  listingStatus: "active" | "pending" | "inactive" | "rejected" | "exported";
  lastError?: string | null;
  meta?: Record<string, unknown>;
};

export type MarketplaceCatalogFetchResult = {
  ok: boolean;
  items: MarketplaceCatalogItem[];
  message: string;
  errors: string[];
};

export type MarketplaceCatalogImportResult = {
  ok: boolean;
  itemsCount: number;
  matched: number;
  unmatched: number;
  message: string;
};
