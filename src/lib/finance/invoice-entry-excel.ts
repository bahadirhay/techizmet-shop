import * as XLSX from "xlsx";

// ── Turkish number/date helpers ────────────────────────────────────────────────

function parseTrNumber(s: unknown): number {
  if (typeof s === "number") return s;
  if (typeof s !== "string") return NaN;
  // "1.234,56" → 1234.56
  return parseFloat(s.replace(/\./g, "").replace(",", ".").trim());
}

function parseTrDate(s: unknown): Date | null {
  if (!s) return null;
  if (s instanceof Date) return Number.isNaN(s.getTime()) ? null : s;
  if (typeof s === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(s);
    if (!d) return null;
    return new Date(Date.UTC(d.y, d.m - 1, d.d));
  }
  if (typeof s !== "string") return null;
  const t = s.trim();
  // DD.MM.YYYY or DD/MM/YYYY
  const m1 = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/.exec(t);
  if (m1) return new Date(Date.UTC(parseInt(m1[3]!), parseInt(m1[2]!) - 1, parseInt(m1[1]!)));
  // YYYY-MM-DD
  const m2 = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m2) return new Date(Date.UTC(parseInt(m2[1]!), parseInt(m2[2]!) - 1, parseInt(m2[3]!)));
  return null;
}

function normalizeKdvRate(rate: number): 1 | 10 | 20 {
  if (rate <= 2) return 1;
  if (rate <= 15) return 10;
  return 20;
}

// ── Column name mapping ────────────────────────────────────────────────────────

const HEADER_MAP: Record<string, string> = {
  // GİB e-Arşiv "Düzenlenen Faturalar" export — outgoing
  "fatura no": "invoiceNo",
  "fatura numarası": "invoiceNo",
  "belge no": "invoiceNo",
  "belge numarası": "invoiceNo",
  "fatura tarihi": "invoiceDate",
  "belge tarihi": "invoiceDate",
  "tarih": "invoiceDate",
  "alıcı adı soyadı / ünvanı": "counterparty",
  "alıcı adı soyadı/ünvanı": "counterparty",
  "alıcı unvanı": "counterparty",
  "alıcı ünvanı": "counterparty",
  "alıcı adı": "counterparty",
  "alıcı": "counterparty",
  "alıcı vkn/tckn": "taxId",
  "alıcı vkn": "taxId",
  "alıcı tckn": "taxId",
  "vkn/tckn": "taxId",
  "vkn": "taxId",
  "kdv matrahı": "netTl",
  "kdv matrah": "netTl",
  "matrah": "netTl",
  "mal/hizmet bedeli": "netTl",
  "mal / hizmet bedeli": "netTl",
  "vergisiz tutar": "netTl",
  "hesaplanan kdv": "kdvTl",
  "kdv tutarı": "kdvTl",
  "kdv miktarı": "kdvTl",
  "kdv": "kdvTl",
  "kdv oranı": "kdvRate",
  "kdv oranı (%)": "kdvRate",
  "vergi oranı": "kdvRate",
  "vergi oranı (%)": "kdvRate",
  "kdv %": "kdvRate",
  // Generic template columns
  "yön": "direction",
  "direction": "direction",
  "net (tl)": "netTl",
  "net tl": "netTl",
  "net": "netTl",
  "kdv (tl)": "kdvTl",
  "kdv tl": "kdvTl",
  "karşı taraf": "counterparty",
  "counterparty": "counterparty",
  "açıklama": "description",
  "description": "description",
};

function mapHeader(raw: string): string {
  return HEADER_MAP[raw.toLowerCase().trim()] ?? "";
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type ExcelEntryRow = {
  direction: "outgoing" | "incoming";
  invoiceDate: Date;
  invoiceNo: string;
  counterparty: string;
  netMinor: number;
  kdvRate: 1 | 10 | 20;
  kdvMinor: number;
  description: string;
};

export type ExcelParseResult = {
  rows: ExcelEntryRow[];
  skipped: number;
  errors: string[];
};

// ── Parser ─────────────────────────────────────────────────────────────────────

export function parseInvoiceEntryExcel(
  buffer: ArrayBuffer,
  defaultDirection: "outgoing" | "incoming" = "outgoing",
): ExcelParseResult {
  const wb = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], skipped: 0, errors: ["Excel dosyasında sayfa bulunamadı."] };

  const ws = wb.Sheets[sheetName]!;
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw: true,
    defval: "",
    blankrows: false,
  });

  if (raw.length === 0) return { rows: [], skipped: 0, errors: ["Sayfada veri satırı bulunamadı."] };

  // Build header → field map from first row keys
  const firstRow = raw[0]!;
  const colMap: Record<string, string> = {};
  for (const key of Object.keys(firstRow)) {
    const field = mapHeader(key);
    if (field) colMap[key] = field;
  }

  const rows: ExcelEntryRow[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i]!;
    const lineNum = i + 2; // 1-indexed, +1 for header

    // Map columns
    const mapped: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(colMap)) {
      mapped[field] = row[key];
    }

    // Direction
    let direction: "outgoing" | "incoming" = defaultDirection;
    const dirRaw = String(mapped["direction"] ?? "").toLowerCase().trim();
    if (dirRaw === "incoming" || dirRaw === "gelen" || dirRaw === "alış" || dirRaw === "gider") {
      direction = "incoming";
    } else if (dirRaw === "outgoing" || dirRaw === "kesilen" || dirRaw === "satış") {
      direction = "outgoing";
    }

    // Invoice date
    const invoiceDate = parseTrDate(mapped["invoiceDate"]);
    if (!invoiceDate) {
      errors.push(`Satır ${lineNum}: Tarih okunamadı ("${String(mapped["invoiceDate"] ?? "")}")`);
      skipped++;
      continue;
    }

    // Net amount
    const netTl = parseTrNumber(mapped["netTl"]);
    if (!Number.isFinite(netTl) || netTl <= 0) {
      errors.push(`Satır ${lineNum}: Matrah/Net tutar okunamadı ("${String(mapped["netTl"] ?? "")}")`);
      skipped++;
      continue;
    }

    // KDV rate
    let kdvRate: 1 | 10 | 20 = 20;
    if (mapped["kdvRate"] !== undefined && mapped["kdvRate"] !== "") {
      const rateRaw = parseTrNumber(mapped["kdvRate"]);
      if (Number.isFinite(rateRaw)) kdvRate = normalizeKdvRate(rateRaw);
    }

    // KDV amount: kdvMinor (kuruş) = netTl(TL) * rate/100 * 100 = netTl * rate
    let kdvMinor: number;
    if (mapped["kdvTl"] !== undefined && mapped["kdvTl"] !== "") {
      const kdvTl = parseTrNumber(mapped["kdvTl"]);
      kdvMinor = Number.isFinite(kdvTl) && kdvTl >= 0 ? Math.round(kdvTl * 100) : Math.round(netTl * kdvRate);
    } else {
      kdvMinor = Math.round(netTl * kdvRate);
    }

    const netMinor = Math.round(netTl * 100);

    const invoiceNo = String(mapped["invoiceNo"] ?? "").trim();
    const taxId = String(mapped["taxId"] ?? "").trim();
    const cpRaw = String(mapped["counterparty"] ?? "").trim();
    const counterparty = taxId && !cpRaw.includes(taxId) ? (cpRaw ? `${cpRaw} (${taxId})` : taxId) : cpRaw;
    const description = String(mapped["description"] ?? "").trim();

    rows.push({
      direction,
      invoiceDate,
      invoiceNo,
      counterparty,
      netMinor,
      kdvRate,
      kdvMinor,
      description,
    });
  }

  return { rows, skipped, errors };
}
