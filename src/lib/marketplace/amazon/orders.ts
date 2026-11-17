import type { AmazonSpApiCredentials } from "@/lib/marketplace/amazon/client";
import {
  amazonSpApiRequest,
  createAmazonRestrictedDataToken,
} from "@/lib/marketplace/amazon/client";
import { pickMoneyMinor } from "@/lib/marketplace/import-helpers";

export const AMAZON_TR_MARKETPLACE_ID = "A33AVAJ2PDY3EV";

export type AmazonOrderLine = {
  orderItemId: string;
  sellerSku?: string;
  title: string;
  qty: number;
  unitMinor: number;
  asin?: string;
};

export type AmazonShippingAddress = {
  name?: string;
  line1?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  phone?: string;
};

export type AmazonOrder = {
  amazonOrderId: string;
  orderStatus: string;
  purchaseDate: Date;
  buyerEmail?: string;
  shippingAddress?: AmazonShippingAddress;
  lines: AmazonOrderLine[];
};

function strField(raw: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function parseAmazonShippingAddress(raw: unknown): AmazonShippingAddress | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const a = raw as Record<string, unknown>;
  const line1Parts = [
    strField(a, "AddressLine1", "addressLine1"),
    strField(a, "AddressLine2", "addressLine2"),
  ].filter(Boolean);
  const name = strField(a, "Name", "name");
  const city = strField(a, "City", "city", "Municipality");
  const district = strField(a, "County", "county", "District", "StateOrRegion", "stateOrRegion");
  const postalCode = strField(a, "PostalCode", "postalCode");
  const phone = strField(a, "Phone", "phone");
  if (!name && line1Parts.length === 0 && !city) return undefined;
  return {
    name,
    line1: line1Parts.join(", ") || undefined,
    city,
    district,
    postalCode,
    phone,
  };
}

function parseAmazonOrderSummary(raw: Record<string, unknown>): Omit<AmazonOrder, "lines"> | null {
  const amazonOrderId = String(raw.AmazonOrderId ?? raw.orderId ?? "").trim();
  if (!amazonOrderId) return null;
  const purchaseDate = raw.PurchaseDate ? new Date(String(raw.PurchaseDate)) : new Date();

  const buyerInfo =
    raw.BuyerInfo && typeof raw.BuyerInfo === "object"
      ? (raw.BuyerInfo as Record<string, unknown>)
      : null;
  const buyerEmail =
    strField(raw, "BuyerEmail") ||
    (buyerInfo ? strField(buyerInfo, "BuyerEmail", "buyerEmail") : undefined);
  const buyerName = buyerInfo
    ? strField(buyerInfo, "BuyerName", "buyerName")
    : undefined;

  const shippingAddress = parseAmazonShippingAddress(raw.ShippingAddress);
  if (shippingAddress && !shippingAddress.name && buyerName) {
    shippingAddress.name = buyerName;
  }

  return {
    amazonOrderId,
    orderStatus: String(raw.OrderStatus ?? raw.fulfillmentStatus ?? "Pending"),
    purchaseDate: Number.isNaN(purchaseDate.getTime()) ? new Date() : purchaseDate,
    buyerEmail,
    shippingAddress:
      shippingAddress ??
      (buyerName ? { name: buyerName } : undefined),
  };
}

function parseAmazonOrderItem(raw: Record<string, unknown>): AmazonOrderLine {
  const orderItemId = String(raw.OrderItemId ?? raw.orderItemId ?? raw.ASIN ?? "item");
  return {
    orderItemId,
    sellerSku: typeof raw.SellerSKU === "string" ? raw.SellerSKU : typeof raw.sellerSku === "string" ? raw.sellerSku : undefined,
    title: typeof raw.Title === "string" ? raw.Title : typeof raw.title === "string" ? raw.title : "Amazon ürün",
    qty: Number(raw.QuantityOrdered ?? raw.quantity ?? 1) || 1,
    unitMinor: pickMoneyMinor(raw.ItemPrice ?? raw.proceeds ?? raw.unitPrice),
    asin: typeof raw.ASIN === "string" ? raw.ASIN : undefined,
  };
}

export async function fetchAmazonOrderItems(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  amazonOrderId: string,
): Promise<{ lines: AmazonOrderLine[]; error?: string }> {
  const lines: AmazonOrderLine[] = [];
  let nextToken: string | undefined;

  do {
    const qs = nextToken ? `?NextToken=${encodeURIComponent(nextToken)}` : "";
    const res = await amazonSpApiRequest(
      creds,
      accessToken,
      `/orders/v0/orders/${encodeURIComponent(amazonOrderId)}/orderItems${qs}`,
    );
    if (!res.ok) {
      return { lines, error: `Amazon orderItems HTTP ${res.status}: ${res.text.slice(0, 160)}` };
    }

    const payload = (res.json as Record<string, unknown>)?.payload as Record<string, unknown> | undefined;
    const list = (payload?.OrderItems as Record<string, unknown>[]) ?? [];
    lines.push(...list.map(parseAmazonOrderItem));
    nextToken = payload?.NextToken != null ? String(payload.NextToken) : undefined;
  } while (nextToken);

  return { lines };
}

/**
 * Tek sipariş — RDT ile alıcı / teslimat adresi (fatura için).
 */
export async function fetchAmazonOrderWithPii(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  amazonOrderId: string,
): Promise<{ order: Omit<AmazonOrder, "lines"> | null; error?: string }> {
  const path = `/orders/v0/orders/${encodeURIComponent(amazonOrderId)}`;
  // Önce tam PII; uygulama rolü yoksa yalnızca buyerInfo dene
  // (buyerInfo ile City/PostalCode gelebiliyor; Name için Direct-to-Consumer Shipping gerekir).
  const attempts: Array<Array<"buyerInfo" | "shippingAddress">> = [
    ["buyerInfo", "shippingAddress"],
    ["buyerInfo"],
  ];
  let lastError = "RDT alınamadı";
  for (const dataElements of attempts) {
    const rdt = await createAmazonRestrictedDataToken(creds, accessToken, [
      { method: "GET", path, dataElements },
    ]);
    if (!rdt.token) {
      lastError = rdt.error ?? lastError;
      continue;
    }
    const res = await amazonSpApiRequest(creds, rdt.token, path);
    if (!res.ok) {
      lastError = `Amazon getOrder HTTP ${res.status}: ${res.text.slice(0, 200)}`;
      continue;
    }
    const payload = (res.json as Record<string, unknown>)?.payload as
      | Record<string, unknown>
      | undefined;
    const raw = payload ?? (res.json as Record<string, unknown>);
    const parsed = raw ? parseAmazonOrderSummary(raw) : null;
    return { order: parsed };
  }
  return { order: null, error: lastError };
}

export async function fetchAmazonOrders(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  params: { sinceDays?: number; marketplaceId?: string } = {},
): Promise<{ ok: boolean; orders: AmazonOrder[]; message: string; errors: string[] }> {
  const sinceDays = params.sinceDays ?? 30;
  const marketplaceId = params.marketplaceId ?? AMAZON_TR_MARKETPLACE_ID;
  const createdAfter = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const errors: string[] = [];
  const summaries: Omit<AmazonOrder, "lines">[] = [];
  let nextToken: string | undefined;

  // Liste RDT — önce tam PII; rol yoksa buyerInfo (şehir/posta en azından gelir).
  let ordersToken = accessToken;
  for (const dataElements of [
    ["buyerInfo", "shippingAddress"] as const,
    ["buyerInfo"] as const,
  ]) {
    const listRdt = await createAmazonRestrictedDataToken(creds, accessToken, [
      { method: "GET", path: "/orders/v0/orders", dataElements: [...dataElements] },
    ]);
    if (listRdt.token) {
      ordersToken = listRdt.token;
      break;
    }
    errors.push(listRdt.error ?? "Amazon RDT alınamadı");
  }

  do {
    const qs = new URLSearchParams({
      MarketplaceIds: marketplaceId,
      CreatedAfter: createdAfter,
      MaxResultsPerPage: "100",
    });
    if (nextToken) qs.set("NextToken", nextToken);

    const res = await amazonSpApiRequest(creds, ordersToken, `/orders/v0/orders?${qs}`);
    if (!res.ok) {
      errors.push(`Amazon orders HTTP ${res.status}: ${res.text.slice(0, 200)}`);
      break;
    }

    const payload = (res.json as Record<string, unknown>)?.payload as Record<string, unknown> | undefined;
    const list = (payload?.Orders as Record<string, unknown>[]) ?? [];
    for (const raw of list) {
      const parsed = parseAmazonOrderSummary(raw);
      if (parsed) summaries.push(parsed);
    }
    nextToken = payload?.NextToken != null ? String(payload.NextToken) : undefined;
  } while (nextToken);

  // Liste RDT ile adres gelmediyse sipariş bazında tamamla (max 40 — rate limit).
  const needPii = summaries.filter((s) => !s.shippingAddress?.name).slice(0, 40);
  for (const summary of needPii) {
    const detail = await fetchAmazonOrderWithPii(creds, accessToken, summary.amazonOrderId);
    if (detail.error) {
      errors.push(`${summary.amazonOrderId}: ${detail.error}`);
      continue;
    }
    if (detail.order?.shippingAddress) {
      summary.shippingAddress = detail.order.shippingAddress;
    }
    if (detail.order?.buyerEmail && !summary.buyerEmail) {
      summary.buyerEmail = detail.order.buyerEmail;
    }
  }

  const orders: AmazonOrder[] = [];
  for (const summary of summaries.slice(0, 100)) {
    const itemsResult = await fetchAmazonOrderItems(creds, accessToken, summary.amazonOrderId);
    if (itemsResult.error) errors.push(`${summary.amazonOrderId}: ${itemsResult.error}`);
    orders.push({
      ...summary,
      lines: itemsResult.lines.length ? itemsResult.lines : [],
    });
  }

  const withAddress = orders.filter((o) => o.shippingAddress?.name).length;
  return {
    ok: orders.length > 0 || errors.length === 0,
    orders,
    message: `${orders.length} Amazon siparişi (${withAddress} alıcı adresli)`,
    errors,
  };
}

export function amazonOrderRef(amazonOrderId: string): string {
  return `amazon_tr:order:${amazonOrderId}`;
}
