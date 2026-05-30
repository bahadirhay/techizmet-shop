import type { AmazonSpApiCredentials } from "@/lib/marketplace/amazon/client";
import { amazonSpApiRequest } from "@/lib/marketplace/amazon/client";
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

export type AmazonOrder = {
  amazonOrderId: string;
  orderStatus: string;
  purchaseDate: Date;
  buyerEmail?: string;
  shippingAddress?: {
    name?: string;
    line1?: string;
    city?: string;
    district?: string;
    postalCode?: string;
    phone?: string;
  };
  lines: AmazonOrderLine[];
};

function parseAmazonOrderSummary(raw: Record<string, unknown>): Omit<AmazonOrder, "lines"> | null {
  const amazonOrderId = String(raw.AmazonOrderId ?? raw.orderId ?? "").trim();
  if (!amazonOrderId) return null;
  const purchaseDate = raw.PurchaseDate ? new Date(String(raw.PurchaseDate)) : new Date();
  return {
    amazonOrderId,
    orderStatus: String(raw.OrderStatus ?? raw.fulfillmentStatus ?? "Pending"),
    purchaseDate: Number.isNaN(purchaseDate.getTime()) ? new Date() : purchaseDate,
    buyerEmail: typeof raw.BuyerEmail === "string" ? raw.BuyerEmail : undefined,
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

  do {
    const qs = new URLSearchParams({
      MarketplaceIds: marketplaceId,
      CreatedAfter: createdAfter,
      MaxResultsPerPage: "100",
    });
    if (nextToken) qs.set("NextToken", nextToken);

    const res = await amazonSpApiRequest(creds, accessToken, `/orders/v0/orders?${qs}`);
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

  const orders: AmazonOrder[] = [];
  for (const summary of summaries.slice(0, 100)) {
    const itemsResult = await fetchAmazonOrderItems(creds, accessToken, summary.amazonOrderId);
    if (itemsResult.error) errors.push(`${summary.amazonOrderId}: ${itemsResult.error}`);
    orders.push({
      ...summary,
      lines: itemsResult.lines.length ? itemsResult.lines : [],
    });
  }

  return {
    ok: orders.length > 0 || errors.length === 0,
    orders,
    message: `${orders.length} Amazon siparişi`,
    errors,
  };
}

export function amazonOrderRef(amazonOrderId: string): string {
  return `amazon_tr:order:${amazonOrderId}`;
}
