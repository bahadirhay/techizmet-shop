export type StoreEventType =
  | "page_view"
  | "product_view"
  | "search_query"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "purchase";

export type StoreEventPayload = {
  page_view?: { path: string; title?: string };
  product_view?: { slug: string; productId?: string; title?: string };
  search_query?: { query: string; source?: string; resultCount?: number };
  add_to_cart?: {
    productId: string;
    slug?: string;
    variantId?: string | null;
    qty: number;
    title?: string;
  };
  remove_from_cart?: { productId: string; variantId?: string | null; qty?: number };
  begin_checkout?: {
    cartValueMinor: number;
    itemCount: number;
    paymentMethod?: string;
  };
  purchase?: {
    orderId: string;
    orderNumber: string;
    valueMinor: number;
    paymentMethod?: string;
  };
};

export type IncomingStoreEvent = {
  type: StoreEventType;
  payload: Record<string, unknown>;
  at?: string;
};

export type UtmAttribution = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};
