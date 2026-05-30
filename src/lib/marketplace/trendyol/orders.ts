import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { trendyolRequest } from "@/lib/marketplace/trendyol/client";

export type TrendyolOrderLine = {
  lineId: number;
  quantity: number;
  barcode?: string;
  merchantSku?: string;
  productName?: string;
  price?: number;
};

export type TrendyolShipmentPackage = {
  shipmentPackageId: number;
  orderNumber: string;
  status: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  cargoTrackingNumber?: string;
  lines: TrendyolOrderLine[];
  shipmentAddress?: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    city?: string;
    district?: string;
    postalCode?: string;
  };
};

function parseLine(raw: Record<string, unknown>): TrendyolOrderLine {
  return {
    lineId: Number(raw.lineId ?? raw.id ?? 0),
    quantity: Number(raw.quantity ?? 1),
    barcode: typeof raw.barcode === "string" ? raw.barcode : undefined,
    merchantSku: typeof raw.merchantSku === "string" ? raw.merchantSku : typeof raw.stockCode === "string" ? raw.stockCode : undefined,
    productName: typeof raw.productName === "string" ? raw.productName : undefined,
    price: typeof raw.price === "number" ? raw.price : undefined,
  };
}

function parsePackage(raw: Record<string, unknown>): TrendyolShipmentPackage | null {
  const shipmentPackageId = Number(raw.shipmentPackageId ?? raw.id ?? 0);
  const orderNumber = String(raw.orderNumber ?? "");
  if (!shipmentPackageId || !orderNumber) return null;
  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];
  return {
    shipmentPackageId,
    orderNumber,
    status: String(raw.status ?? raw.shipmentPackageStatus ?? "Created"),
    customerFirstName: typeof raw.customerFirstName === "string" ? raw.customerFirstName : undefined,
    customerLastName: typeof raw.customerLastName === "string" ? raw.customerLastName : undefined,
    customerEmail: typeof raw.customerEmail === "string" ? raw.customerEmail : undefined,
    customerPhone: typeof raw.customerPhone === "string" ? raw.customerPhone : undefined,
    cargoTrackingNumber: typeof raw.cargoTrackingNumber === "string" ? raw.cargoTrackingNumber : undefined,
    lines: linesRaw.map((l) => parseLine(l as Record<string, unknown>)).filter((l) => l.lineId > 0),
    shipmentAddress:
      raw.shipmentAddress && typeof raw.shipmentAddress === "object"
        ? (raw.shipmentAddress as TrendyolShipmentPackage["shipmentAddress"])
        : undefined,
  };
}

export async function fetchTrendyolOrders(
  creds: TrendyolCredentials,
  params: {
    status?: string;
    page?: number;
    size?: number;
    startDate?: number;
    endDate?: number;
  } = {},
): Promise<{ ok: boolean; packages: TrendyolShipmentPackage[]; message: string }> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.page != null) q.set("page", String(params.page));
  q.set("size", String(params.size ?? 50));
  q.set("orderByField", "PackageLastModifiedDate");
  q.set("orderByDirection", "DESC");
  if (params.startDate) q.set("startDate", String(params.startDate));
  if (params.endDate) q.set("endDate", String(params.endDate));

  const path = `/integration/order/sellers/${creds.sellerId}/orders?${q.toString()}`;
  const res = await trendyolRequest(creds, path, { method: "GET" });

  if (!res.ok) {
    return {
      ok: false,
      packages: [],
      message: `Trendyol sipariş HTTP ${res.status}: ${res.text.slice(0, 300)}`,
    };
  }

  const body = res.json as { content?: unknown[] } | unknown[] | null;
  const list = Array.isArray(body) ? body : Array.isArray(body?.content) ? body.content : [];
  const packages = list
    .map((item) => parsePackage(item as Record<string, unknown>))
    .filter((p): p is TrendyolShipmentPackage => p != null);

  return { ok: true, packages, message: `${packages.length} paket alındı` };
}
