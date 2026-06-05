import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { trendyolAuthHeaders } from "@/lib/marketplace/trendyol/headers";

export type TrendyolFinancialRow = {
  id: string;
  transactionDate: number;
  transactionType: string;
  description: string | null;
  debt: number;
  credit: number;
  commissionAmount: number | null;
  commissionInvoiceSerialNumber: string | null;
  sellerRevenue: number | null;
  orderNumber: string | null;
  paymentOrderId: number | null;
  paymentDate: number | null;
  shipmentPackageId: number | null;
};

export type TrendyolFinancePage = {
  page: number;
  totalPages: number;
  content: TrendyolFinancialRow[];
};

function trendyolFinanceBase(creds: TrendyolCredentials): string {
  return creds.stage
    ? "https://stageapigw.trendyol.com/integration/finance/che"
    : "https://apigw.trendyol.com/integration/finance/che";
}

async function trendyolFinanceRequest(
  creds: TrendyolCredentials,
  path: string,
): Promise<{ ok: boolean; status: number; text: string; json: unknown }> {
  const url = `${trendyolFinanceBase(creds)}${path}`;
  const res = await fetch(url, {
    headers: trendyolAuthHeaders(creds),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, text, json };
}

function parseFinancialRow(raw: Record<string, unknown>): TrendyolFinancialRow | null {
  const id = String(raw.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    transactionDate: Number(raw.transactionDate ?? 0),
    transactionType: String(raw.transactionType ?? ""),
    description: raw.description != null ? String(raw.description) : null,
    debt: Number(raw.debt ?? 0),
    credit: Number(raw.credit ?? 0),
    commissionAmount: raw.commissionAmount != null ? Number(raw.commissionAmount) : null,
    commissionInvoiceSerialNumber:
      raw.commissionInvoiceSerialNumber != null
        ? String(raw.commissionInvoiceSerialNumber)
        : null,
    sellerRevenue: raw.sellerRevenue != null ? Number(raw.sellerRevenue) : null,
    orderNumber: raw.orderNumber != null ? String(raw.orderNumber) : null,
    paymentOrderId: raw.paymentOrderId != null ? Number(raw.paymentOrderId) : null,
    paymentDate: raw.paymentDate != null ? Number(raw.paymentDate) : null,
    shipmentPackageId:
      raw.shipmentPackageId != null ? Number(raw.shipmentPackageId) : null,
  };
}

function parseFinancePage(json: unknown): TrendyolFinancePage {
  const obj = json as Record<string, unknown>;
  const contentRaw = Array.isArray(obj?.content) ? obj.content : [];
  const content = contentRaw
    .map((row) => parseFinancialRow(row as Record<string, unknown>))
    .filter(Boolean) as TrendyolFinancialRow[];
  return {
    page: Number(obj?.page ?? 0),
    totalPages: Number(obj?.totalPages ?? 1),
    content,
  };
}

export function splitDateRangeMs(
  startMs: number,
  endMs: number,
  maxDays = 15,
): { startMs: number; endMs: number }[] {
  const maxSpan = maxDays * 86400000;
  const ranges: { startMs: number; endMs: number }[] = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const chunkEnd = Math.min(cursor + maxSpan - 1, endMs);
    ranges.push({ startMs: cursor, endMs: chunkEnd });
    cursor = chunkEnd + 1;
  }
  return ranges;
}

async function fetchAllPages(
  creds: TrendyolCredentials,
  buildPath: (page: number) => string,
): Promise<{ rows: TrendyolFinancialRow[]; error?: string }> {
  const rows: TrendyolFinancialRow[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const res = await trendyolFinanceRequest(creds, buildPath(page));
    if (!res.ok) {
      return {
        rows,
        error: `Trendyol finans HTTP ${res.status}: ${res.text.slice(0, 200)}`,
      };
    }
    const parsed = parseFinancePage(res.json);
    rows.push(...parsed.content);
    totalPages = parsed.totalPages || 1;
    page += 1;
    if (parsed.content.length === 0) break;
  }

  return { rows };
}

export async function fetchTrendyolOtherFinancials(
  creds: TrendyolCredentials,
  transactionType: string,
  startMs: number,
  endMs: number,
): Promise<{ rows: TrendyolFinancialRow[]; error?: string }> {
  return fetchAllPages(
    creds,
    (page) =>
      `/sellers/${creds.sellerId}/otherfinancials?transactionType=${encodeURIComponent(transactionType)}&startDate=${startMs}&endDate=${endMs}&page=${page}&size=500`,
  );
}

export async function fetchTrendyolSettlements(
  creds: TrendyolCredentials,
  transactionType: string,
  startMs: number,
  endMs: number,
): Promise<{ rows: TrendyolFinancialRow[]; error?: string }> {
  return fetchAllPages(
    creds,
    (page) =>
      `/sellers/${creds.sellerId}/settlements?transactionType=${encodeURIComponent(transactionType)}&startDate=${startMs}&endDate=${endMs}&page=${page}&size=500`,
  );
}

export async function fetchTrendyolFinanceRange(
  creds: TrendyolCredentials,
  fetcher: (
    creds: TrendyolCredentials,
    type: string,
    startMs: number,
    endMs: number,
  ) => Promise<{ rows: TrendyolFinancialRow[]; error?: string }>,
  transactionTypes: string[],
  startMs: number,
  endMs: number,
): Promise<{ rows: TrendyolFinancialRow[]; errors: string[] }> {
  const rows: TrendyolFinancialRow[] = [];
  const errors: string[] = [];
  const ranges = splitDateRangeMs(startMs, endMs);

  for (const type of transactionTypes) {
    for (const range of ranges) {
      const result = await fetcher(creds, type, range.startMs, range.endMs);
      if (result.error) errors.push(`${type}: ${result.error}`);
      rows.push(...result.rows);
    }
  }

  return { rows, errors };
}

export function tryAmountToMinor(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}
