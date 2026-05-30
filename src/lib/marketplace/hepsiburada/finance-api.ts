export type HepsiburadaFinanceCredentials = {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  stage: boolean;
  financeBaseUrl?: string;
};

export function parseHepsiburadaFinanceConfig(config: Record<string, string>): HepsiburadaFinanceCredentials | null {
  const merchantId = config.sellerId?.trim() || config.merchantId?.trim();
  const apiKey = config.apiKey?.trim();
  const apiSecret = config.apiSecret?.trim() || config.secretKey?.trim();
  if (!merchantId || !apiKey || !apiSecret) return null;
  const stage = config.testMode === "true";
  const financeBaseUrl =
    config.hepsiburadaFinanceBaseUrl?.trim() ||
    (stage ? "https://mpfinance-external-sit.hepsiburada.com" : "https://mpfinance-external.hepsiburada.com");
  return { merchantId, apiKey, apiSecret, stage, financeBaseUrl };
}

export type HepsiburadaFinanceRow = {
  id: string;
  transactionType: string;
  amountMinor: number;
  isIncome: boolean;
  isInvoice: boolean;
  orderNumber: string | null;
  packageNumber: string | null;
  paymentDate: Date | null;
  recordDate: Date | null;
  status: string | null;
  referenceDocument: string | null;
  settlementId: string | null;
  paymentReference: string | null;
  raw: Record<string, unknown>;
};

function parseDate(raw: unknown): Date | null {
  if (raw == null) return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickAmount(raw: Record<string, unknown>): number {
  const candidates = [
    raw.amount,
    raw.netAmount,
    raw.totalAmount,
    raw.value,
    (raw.money as Record<string, unknown> | undefined)?.value,
    (raw.amount as Record<string, unknown> | undefined)?.value,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n !== 0) return Math.abs(n);
  }
  return 0;
}

function parseRow(raw: Record<string, unknown>): HepsiburadaFinanceRow | null {
  const id = String(raw.id ?? raw.transactionId ?? raw.referenceDocument ?? "").trim();
  if (!id) return null;

  const amount = pickAmount(raw);
  const isIncome = raw.isIncome === true || raw.IsIncome === true;
  const isInvoice = raw.isInvoice === true || raw.IsInvoice === true;

  return {
    id,
    transactionType: String(raw.transactionType ?? raw.type ?? ""),
    amountMinor: Math.round(amount * 100),
    isIncome,
    isInvoice,
    orderNumber: raw.orderNumber != null ? String(raw.orderNumber) : null,
    packageNumber: raw.packageNumber != null ? String(raw.packageNumber) : null,
    paymentDate: parseDate(raw.paymentDate),
    recordDate: parseDate(raw.recordDate ?? raw.transactionDate),
    status: raw.status != null ? String(raw.status) : null,
    referenceDocument: raw.referenceDocument != null ? String(raw.referenceDocument) : null,
    settlementId:
      raw.settlementId != null
        ? String(raw.settlementId)
        : raw.paymentOrderId != null
          ? String(raw.paymentOrderId)
          : null,
    paymentReference: raw.paymentReference != null ? String(raw.paymentReference) : null,
    raw,
  };
}

function extractRows(json: unknown): HepsiburadaFinanceRow[] {
  if (Array.isArray(json)) {
    return json
      .map((row) => parseRow(row as Record<string, unknown>))
      .filter(Boolean) as HepsiburadaFinanceRow[];
  }
  const obj = json as Record<string, unknown>;
  const list =
    (Array.isArray(obj?.items) && obj.items) ||
    (Array.isArray(obj?.data) && obj.data) ||
    (Array.isArray(obj?.transactions) && obj.transactions) ||
    (Array.isArray((obj?.data as Record<string, unknown>)?.items) &&
      (obj.data as Record<string, unknown>).items) ||
    [];
  return (list as Record<string, unknown>[])
    .map((row) => parseRow(row))
    .filter(Boolean) as HepsiburadaFinanceRow[];
}

export async function fetchHepsiburadaTransactions(
  creds: HepsiburadaFinanceCredentials,
  params: {
    paymentDateStart: string;
    paymentDateEnd: string;
    transactionTypes?: string;
    status?: string;
  },
): Promise<{ rows: HepsiburadaFinanceRow[]; error?: string }> {
  const rows: HepsiburadaFinanceRow[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const qs = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
      paymentDateStart: params.paymentDateStart,
      paymentDateEnd: params.paymentDateEnd,
    });
    if (params.transactionTypes) qs.set("transactionTypes", params.transactionTypes);
    if (params.status) qs.set("status", params.status);

    const url = `${creds.financeBaseUrl!.replace(/\/$/, "")}/transactions/merchantid/${encodeURIComponent(creds.merchantId)}?${qs}`;
    const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");

    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "User-Agent": `${creds.merchantId} - TechizmetShop`,
      },
    });
    const text = await res.text();
    if (!res.ok) {
      return { rows, error: `Hepsiburada finans HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : [];
    } catch {
      return { rows, error: "Hepsiburada finans yanıtı JSON değil" };
    }

    const page = extractRows(json);
    rows.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }

  return { rows };
}

export function formatHbDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
