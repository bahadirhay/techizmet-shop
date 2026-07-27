import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { trendyolRequest } from "@/lib/marketplace/trendyol/client";

export type TrendyolOrderLine = {
  lineId: number;
  quantity: number;
  barcode?: string;
  merchantSku?: string;
  productName?: string;
  /** İndirimli net birim fiyat (KDV dâhil) — Trendyol'un faturalanacak tutarı. */
  price?: number;
  /** İndirimsiz (liste) birim fiyat (KDV dâhil). */
  amount?: number;
  /** Satır toplam satıcı indirimi. */
  discount?: number;
  /** Satır toplam Trendyol indirimi. */
  tyDiscount?: number;
  /** KDV oranı (%). */
  vatRate?: number;
};

export type TrendyolShipmentPackage = {
  shipmentPackageId: number;
  orderNumber: string;
  status: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  /** Kargo takip numarası (Trendyol sayı döndürür → string'e çevrilir). */
  cargoTrackingNumber?: string;
  /** Kargo firması adı — ör. "Aras Kargo Marketplace". */
  cargoProviderName?: string;
  /** Trendyol takip linki (doğrudan sorgulanabilir). */
  cargoTrackingLink?: string;
  /** Kargo gönderi (sender) numarası. */
  cargoSenderNumber?: string;
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

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Trendyol bazı alanları (takip no gibi) sayı olarak döndürür; string'e çevirir. */
function str(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function parseLine(raw: Record<string, unknown>): TrendyolOrderLine {
  return {
    lineId: Number(raw.lineId ?? raw.id ?? 0),
    quantity: Number(raw.quantity ?? 1),
    barcode: typeof raw.barcode === "string" ? raw.barcode : undefined,
    merchantSku: typeof raw.merchantSku === "string" ? raw.merchantSku : typeof raw.stockCode === "string" ? raw.stockCode : undefined,
    productName: typeof raw.productName === "string" ? raw.productName : undefined,
    // Trendyol `price` = indirim uygulanmış net birim fiyat = faturalanacak tutar.
    price: num(raw.price),
    amount: num(raw.amount),
    discount: num(raw.discount),
    tyDiscount: num(raw.tyDiscount),
    vatRate: num(raw.vatRate) ?? num(raw.vatBaseAmount),
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
    // Trendyol takip no'yu sayı olarak döndürür — str() ile string'e çeviririz.
    cargoTrackingNumber: str(raw.cargoTrackingNumber),
    cargoProviderName: str(raw.cargoProviderName),
    cargoTrackingLink: str(raw.cargoTrackingLink),
    cargoSenderNumber: str(raw.cargoSenderNumber),
    lines: linesRaw.map((l) => parseLine(l as Record<string, unknown>)).filter((l) => l.lineId > 0),
    shipmentAddress:
      raw.shipmentAddress && typeof raw.shipmentAddress === "object"
        ? (raw.shipmentAddress as TrendyolShipmentPackage["shipmentAddress"])
        : undefined,
  };
}

/** Trendyol sevkiyat paketi durumları (tüm sipariş çekiminde gezilecek). */
export const TRENDYOL_ALL_STATUSES = [
  "Created",
  "Picking",
  "Invoiced",
  "Shipped",
  "AtCollectionPoint",
  "Delivered",
  "UnPacked",
  "UnSupplied",
  "Cancelled",
  "UnDelivered",
  "Returned",
] as const;

/**
 * Cron / "yeni sipariş" çekimi.
 * Açık paketler + sevkiyat/teslim/iptal — admin durumu Trendyol ile senkron kalsın
 * (aksi halde "tamamlandı"yı elle yapmak gerekir).
 */
export const TRENDYOL_OPEN_STATUSES = [
  "Created",
  "Picking",
  "Invoiced",
  "UnPacked",
  "Shipped",
  "AtCollectionPoint",
  "Delivered",
  "Cancelled",
  "UnSupplied",
  "UnDelivered",
  "Returned",
] as const;

export async function fetchTrendyolOrders(
  creds: TrendyolCredentials,
  params: {
    status?: string;
    page?: number;
    size?: number;
    startDate?: number;
    endDate?: number;
  } = {},
): Promise<{ ok: boolean; packages: TrendyolShipmentPackage[]; totalPages: number; message: string }> {
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
      totalPages: 0,
      message: `Trendyol sipariş HTTP ${res.status}: ${res.text.slice(0, 300)}`,
    };
  }

  const body = res.json as { content?: unknown[]; totalPages?: number } | unknown[] | null;
  const list = Array.isArray(body) ? body : Array.isArray(body?.content) ? body.content : [];
  const totalPages =
    !Array.isArray(body) && typeof body?.totalPages === "number" && body.totalPages > 0
      ? body.totalPages
      : 1;
  const packages = list
    .map((item) => parsePackage(item as Record<string, unknown>))
    .filter((p): p is TrendyolShipmentPackage => p != null);

  return { ok: true, packages, totalPages, message: `${packages.length} paket alındı` };
}

/**
 * Tüm Trendyol siparişlerini çeker: her statüyü ayrı ayrı ve tüm sayfaları
 * gezerek. Aynı paket birden fazla statüde görünürse tekilleştirilir.
 */
export async function fetchAllTrendyolOrders(
  creds: TrendyolCredentials,
  params: {
    statuses?: readonly string[];
    startDate?: number;
    endDate?: number;
    size?: number;
    maxPagesPerStatus?: number;
  } = {},
): Promise<{ ok: boolean; packages: TrendyolShipmentPackage[]; message: string }> {
  const statuses = params.statuses ?? TRENDYOL_ALL_STATUSES;
  const size = params.size ?? 200;
  const maxPages = params.maxPagesPerStatus ?? 50;
  const byId = new Map<number, TrendyolShipmentPackage>();
  const errors: string[] = [];
  let anyOk = false;

  for (const status of statuses) {
    let page = 0;
    while (page < maxPages) {
      const r = await fetchTrendyolOrders(creds, {
        status,
        page,
        size,
        startDate: params.startDate,
        endDate: params.endDate,
      });
      if (!r.ok) {
        errors.push(`${status}: ${r.message}`);
        break;
      }
      anyOk = true;
      for (const p of r.packages) byId.set(p.shipmentPackageId, p);
      if (r.packages.length === 0 || page + 1 >= r.totalPages) break;
      page++;
    }
  }

  const packages = [...byId.values()];
  return {
    ok: anyOk,
    packages,
    message:
      `${packages.length} paket alındı (${statuses.length} statü tarandı)` +
      (errors.length ? ` · uyarı: ${errors.slice(0, 3).join("; ")}` : ""),
  };
}
