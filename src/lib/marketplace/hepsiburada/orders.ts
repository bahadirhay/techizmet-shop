import type { HepsiburadaOmsCredentials } from "@/lib/marketplace/hepsiburada/client";
import { formatHbOmsDate, hepsiburadaOmsRequest } from "@/lib/marketplace/hepsiburada/client";
import { pickMoneyMinor } from "@/lib/marketplace/import-helpers";

export type HepsiburadaOrderLine = {
  lineId: string;
  quantity: number;
  merchantSku?: string;
  barcode?: string;
  productName?: string;
  unitMinor: number;
  hbSku?: string;
};

export type HepsiburadaPackage = {
  packageNumber: string;
  orderNumber: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  trackingNumber?: string;
  lines: HepsiburadaOrderLine[];
  shippingAddress?: {
    line1?: string;
    city?: string;
    district?: string;
    postalCode?: string;
  };
};

function parseHbLine(raw: Record<string, unknown>, index: number): HepsiburadaOrderLine {
  const lineId = String(raw.lineItemId ?? raw.id ?? raw.orderNumber ?? index);
  return {
    lineId,
    quantity: Number(raw.quantity ?? raw.count ?? 1) || 1,
    merchantSku:
      typeof raw.merchantSKU === "string"
        ? raw.merchantSKU
        : typeof raw.merchantSku === "string"
          ? raw.merchantSku
          : undefined,
    barcode: typeof raw.barcode === "string" ? raw.barcode : undefined,
    productName:
      typeof raw.productName === "string"
        ? raw.productName
        : typeof raw.name === "string"
          ? raw.name
          : undefined,
    unitMinor: pickMoneyMinor(raw.unitPrice ?? raw.price ?? raw.totalPrice),
    hbSku: typeof raw.hbSku === "string" ? raw.hbSku : typeof raw.sku === "string" ? raw.sku : undefined,
  };
}

function parseHbPackage(raw: Record<string, unknown>): HepsiburadaPackage | null {
  const packageNumber = String(raw.packageNumber ?? raw.id ?? raw.packageId ?? "").trim();
  const orderNumber = String(raw.orderNumber ?? raw.orderNumbers ?? "").trim();
  if (!packageNumber) return null;

  const itemsRaw =
    (Array.isArray(raw.items) && raw.items) ||
    (Array.isArray(raw.lineItems) && raw.lineItems) ||
    (Array.isArray(raw.lines) && raw.lines) ||
    [];

  const lines = itemsRaw.map((item, i) => parseHbLine(item as Record<string, unknown>, i));
  const resolvedOrderNumber =
    orderNumber ||
    (lines[0] ? String((itemsRaw[0] as Record<string, unknown>).orderNumber ?? "") : "") ||
    packageNumber;

  const addr =
    raw.shippingAddress && typeof raw.shippingAddress === "object"
      ? (raw.shippingAddress as Record<string, unknown>)
      : raw;

  return {
    packageNumber,
    orderNumber: resolvedOrderNumber,
    status: String(raw.status ?? raw.packageStatus ?? "Open"),
    customerName: [raw.customerName, raw.recipientName, raw.firstName, raw.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || undefined,
    customerEmail: typeof raw.email === "string" ? raw.email : typeof raw.customerEmail === "string" ? raw.customerEmail : undefined,
    customerPhone:
      typeof raw.phoneNumber === "string"
        ? raw.phoneNumber
        : typeof raw.customerPhone === "string"
          ? raw.customerPhone
          : undefined,
    trackingNumber:
      typeof raw.barcode === "string" && String(raw.status ?? "").toLowerCase().includes("ship")
        ? raw.barcode
        : typeof raw.trackingNumber === "string"
          ? raw.trackingNumber
          : typeof raw.cargoTrackingNumber === "string"
            ? raw.cargoTrackingNumber
            : undefined,
    lines: lines.length ? lines : [parseHbLine(raw, 0)],
    shippingAddress: {
      line1:
        typeof addr.shippingAddressDetail === "string"
          ? addr.shippingAddressDetail
          : typeof addr.address === "string"
            ? addr.address
            : undefined,
      city: typeof addr.shippingCity === "string" ? addr.shippingCity : typeof addr.city === "string" ? addr.city : undefined,
      district:
        typeof addr.shippingDistrict === "string"
          ? addr.shippingDistrict
          : typeof addr.district === "string"
            ? addr.district
            : undefined,
      postalCode:
        typeof addr.shippingPostalCode === "string"
          ? addr.shippingPostalCode
          : typeof addr.postalCode === "string"
            ? addr.postalCode
            : undefined,
    },
  };
}

function extractList(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  const obj = json as Record<string, unknown>;
  const candidates = [obj?.items, obj?.data, obj?.packages, obj?.orders, (obj?.data as Record<string, unknown>)?.items];
  for (const c of candidates) {
    if (Array.isArray(c)) return c as Record<string, unknown>[];
  }
  return [];
}

async function fetchHbPaged(
  creds: HepsiburadaOmsCredentials,
  buildPath: (offset: number, limit: number) => string,
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const res = await hepsiburadaOmsRequest(creds, buildPath(offset, limit));
    if (!res.ok) {
      return { rows, error: `Hepsiburada OMS HTTP ${res.status}: ${res.text.slice(0, 200)}` };
    }
    const page = extractList(res.json);
    rows.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }

  return { rows };
}

export async function fetchHepsiburadaPackages(
  creds: HepsiburadaOmsCredentials,
  params: { sinceDays?: number } = {},
): Promise<{ ok: boolean; packages: HepsiburadaPackage[]; message: string; errors: string[] }> {
  const sinceDays = params.sinceDays ?? 30;
  const end = new Date();
  const start = new Date(end.getTime() - sinceDays * 86400000);
  const begin = formatHbOmsDate(start);
  const endStr = formatHbOmsDate(end);
  const errors: string[] = [];

  const packageResult = await fetchHbPaged(
    creds,
    (offset, limit) =>
      `/packages/merchantid/${encodeURIComponent(creds.merchantId)}?offset=${offset}&limit=${limit}&begindate=${encodeURIComponent(begin)}&enddate=${encodeURIComponent(endStr)}`,
  );
  if (packageResult.error) errors.push(packageResult.error);

  const orderResult = await fetchHbPaged(
    creds,
    (offset, limit) =>
      `/orders/merchantid/${encodeURIComponent(creds.merchantId)}?offset=${offset}&limit=${limit}&begindate=${encodeURIComponent(begin)}&enddate=${encodeURIComponent(endStr)}`,
  );
  if (orderResult.error) errors.push(orderResult.error);

  const map = new Map<string, HepsiburadaPackage>();

  for (const raw of packageResult.rows) {
    const pkg = parseHbPackage(raw);
    if (pkg) map.set(pkg.packageNumber, pkg);
  }

  for (const raw of orderResult.rows) {
    const orderNumber = String(raw.orderNumber ?? raw.id ?? "").trim();
    if (!orderNumber) continue;
    const pseudoPackage = parseHbPackage({
      ...raw,
      packageNumber: String(raw.packageNumber ?? raw.id ?? orderNumber),
      orderNumber,
      items: raw.items ?? raw.lineItems ?? [raw],
    });
    if (pseudoPackage && !map.has(pseudoPackage.packageNumber)) {
      map.set(pseudoPackage.packageNumber, pseudoPackage);
    }
  }

  const packages = [...map.values()];
  return {
    ok: packages.length > 0 || errors.length === 0,
    packages,
    message: `${packages.length} HB paket/sipariş`,
    errors,
  };
}
