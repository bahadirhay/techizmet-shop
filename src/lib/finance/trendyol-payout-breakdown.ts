import "server-only";

import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import {
  fetchTrendyolPaymentOrderBundle,
  toMinorSigned,
  type TrendyolFinancialRow,
} from "@/lib/marketplace/trendyol/finance-api";

/** Trendyol partner paneli ödeme günü kalemleri */
export const TRENDYOL_PAYOUT_LINE_DEFS = [
  {
    key: "sales",
    label: "Satış Tutarı",
    description:
      "İlgili ödeme gününe dahil olan siparişlerinizden elde ettiğiniz toplam hakediş tutarıdır.",
  },
  {
    key: "cargo",
    label: "Kargo Kesintisi",
    description: "İlgili ödeme günü için yansıtılan toplam kargo bedelidir.",
  },
  {
    key: "commission",
    label: "Komisyon Kesintisi",
    description:
      "İlgili ödeme gününe dahil olan siparişlerinizden kesilen komisyon tutarıdır.",
  },
  {
    key: "platformFee",
    label: "Platform Hizmet Bedeli",
    description: "Platform üzerindeki işlemleriniz için alınan hizmet bedelidir.",
  },
  {
    key: "stoppage",
    label: "E-ticaret Stopajı",
    description:
      "İlgili ödeme gününe ilişkin 7524 sayılı kanun kapsamında yapılan Gelir/Kurumlar Vergisi stopajıdır.",
  },
  {
    key: "other",
    label: "Diğer",
    description:
      "İlgili ödeme gününe dahil olan virman, havale gibi tutarları ifade etmektedir.",
  },
  {
    key: "penalty",
    label: "Ceza Kesintisi",
    description: "İlgili ödeme gününe dahil olan ceza kesintisidir.",
  },
  {
    key: "microExportReturn",
    label: "Yurtdışı Operasyon İade Bedeli",
    description:
      "İlgili ödeme gününe dahil olan iadeye dönmüş mikro ihracat siparişleri için alınan operasyon bedelidir.",
  },
  {
    key: "advertising",
    label: "Reklam Harcaması",
    description: "İlgili ödeme gününe dahil olan reklam harcamasıdır.",
  },
] as const;

export type TrendyolPayoutLineKey = (typeof TRENDYOL_PAYOUT_LINE_DEFS)[number]["key"];

export type TrendyolPayoutBreakdownLine = {
  key: TrendyolPayoutLineKey;
  label: string;
  description: string;
  /** Satış pozitif; kesintiler negatif (partner paneli gibi) */
  amountMinor: number;
};

export type TrendyolPayoutBreakdown = {
  paymentOrderId: number;
  lines: TrendyolPayoutBreakdownLine[];
  /** Satırların toplamı — bankaya yatması beklenen net */
  computedNetMinor: number;
  orderNumbers: string[];
  rawRowCount: number;
  errors: string[];
};

/** Panel kalemleri için yeterli çekirdek tipler (429 önlemek için dar tutuldu) */
const SETTLEMENT_TYPES = [
  "Sale",
  "Return",
  "Discount",
  "Coupon",
  "SellerRevenuePositive",
  "SellerRevenueNegative",
  "CommissionPositive",
  "CommissionNegative",
];

const OTHER_TYPES = [
  "Stoppage",
  "DeductionInvoices",
  "WireTransfer",
  "IncomingTransfer",
  "CashAdvance",
  "FinancialItem",
];

function normalizeTr(text: string): string {
  return text.toLocaleLowerCase("tr-TR");
}

function isCancelType(type: string): boolean {
  const t = normalizeTr(type);
  return t.includes("cancel") || t.includes("iptal");
}

function emptyBuckets(): Record<TrendyolPayoutLineKey, number> {
  return {
    sales: 0,
    cargo: 0,
    commission: 0,
    platformFee: 0,
    stoppage: 0,
    other: 0,
    penalty: 0,
    microExportReturn: 0,
    advertising: 0,
  };
}

export function classifyTrendyolDeductionLine(
  transactionType: string,
  description: string | null,
): TrendyolPayoutLineKey {
  const hay = normalizeTr(`${transactionType} ${description ?? ""}`);
  if (hay.includes("stopaj")) return "stoppage";
  if (hay.includes("kargo")) return "cargo";
  if (hay.includes("platform")) return "platformFee";
  if (hay.includes("reklam") || hay.includes("advert")) return "advertising";
  if (hay.includes("ceza")) return "penalty";
  if (
    hay.includes("yurtdışı") ||
    hay.includes("yurtdisi") ||
    hay.includes("mikro ihracat") ||
    hay.includes("mikroihracat") ||
    (hay.includes("operasyon") && hay.includes("iade"))
  ) {
    return "microExportReturn";
  }
  return "other";
}

/**
 * Settlement + otherfinancials satırlarından partner paneli kalemlerini üretir.
 *
 * Doğrulanan formül (Sale modeli):
 * Satış = Sale.credit − Discount/Return.debt
 * Komisyon = −(Sale.commission − Discount/Return.commission)
 * Net = Satış + Kargo + Komisyon + Platform + Stopaj + …
 */
export function aggregateTrendyolPayoutBreakdown(
  paymentOrderId: number,
  rows: TrendyolFinancialRow[],
  errors: string[] = [],
): TrendyolPayoutBreakdown {
  const buckets = emptyBuckets();
  const orderNumbers: string[] = [];

  for (const row of rows) {
    const type = row.transactionType?.trim() || "";
    const typeNorm = normalizeTr(type);
    const cancel = isCancelType(type);
    const sign = cancel ? -1 : 1;

    if (row.orderNumber?.trim() && !orderNumbers.includes(row.orderNumber.trim())) {
      orderNumbers.push(row.orderNumber.trim());
    }

    // Ödeme emri satırı kırılıma girmez
    if (typeNorm === "ödeme" || typeNorm === "paymentorder") continue;

    if (typeNorm === "sale" || typeNorm === "satış" || typeNorm === "satis") {
      buckets.sales += sign * toMinorSigned(row.credit || 0);
      buckets.commission -= sign * toMinorSigned(row.commissionAmount ?? 0);
      continue;
    }

    if (
      typeNorm === "return" ||
      typeNorm === "iade" ||
      typeNorm.includes("discount") ||
      typeNorm.includes("indirim") ||
      typeNorm.includes("coupon") ||
      typeNorm.includes("kupon") ||
      typeNorm.includes("tydiscount") ||
      typeNorm.includes("tycoupon")
    ) {
      if (row.debt > 0) buckets.sales -= sign * toMinorSigned(row.debt);
      else if (row.credit > 0) buckets.sales += sign * toMinorSigned(row.credit);
      // İndirim/iadede komisyon da düşer → kesinti azalır
      buckets.commission += sign * toMinorSigned(row.commissionAmount ?? 0);
      continue;
    }

    if (typeNorm.includes("commissionnegative")) {
      buckets.commission -= sign * toMinorSigned(row.debt || row.commissionAmount || 0);
      continue;
    }
    if (typeNorm.includes("commissionpositive")) {
      buckets.commission +=
        sign * toMinorSigned(row.credit || row.debt || row.commissionAmount || 0);
      continue;
    }
    if (typeNorm.includes("sellerrevenuepositive")) {
      buckets.sales += sign * toMinorSigned(row.credit || row.sellerRevenue || 0);
      continue;
    }
    if (typeNorm.includes("sellerrevenuenegative")) {
      buckets.sales -= sign * toMinorSigned(row.debt || 0);
      continue;
    }
    if (typeNorm.includes("deliveryfee") || typeNorm.includes("teslimat")) {
      const amt = toMinorSigned(row.debt || 0) - toMinorSigned(row.credit || 0);
      buckets.cargo -= sign * amt;
      continue;
    }
    if (
      typeNorm.includes("manualrefund") ||
      typeNorm.includes("manuel") ||
      typeNorm.includes("provision")
    ) {
      buckets.other += sign * (toMinorSigned(row.credit || 0) - toMinorSigned(row.debt || 0));
      continue;
    }

    if (typeNorm.includes("stopaj") || typeNorm === "stoppage") {
      buckets.stoppage -=
        sign * (toMinorSigned(row.debt || 0) - toMinorSigned(row.credit || 0));
      continue;
    }

    if (
      typeNorm.includes("wiretransfer") ||
      typeNorm.includes("incomingtransfer") ||
      typeNorm.includes("cashadvance") ||
      typeNorm.includes("financialitem") ||
      typeNorm.includes("returninvoice") ||
      typeNorm.includes("commissionagreement") ||
      typeNorm.includes("virman") ||
      typeNorm.includes("havale")
    ) {
      buckets.other += toMinorSigned(row.credit || 0) - toMinorSigned(row.debt || 0);
      continue;
    }

    // DeductionInvoices — etiket transactionType'ta (Kargo Fatura, Platform Hizmet Bedeli, …)
    if (
      typeNorm.includes("platform") ||
      typeNorm.includes("kargo") ||
      typeNorm.includes("reklam") ||
      typeNorm.includes("ceza") ||
      typeNorm.includes("fatura") ||
      typeNorm === "deductioninvoices" ||
      typeNorm.includes("yurtdışı") ||
      typeNorm.includes("yurtdisi") ||
      typeNorm.includes("operasyon")
    ) {
      const key = classifyTrendyolDeductionLine(type, row.description);
      const amt = toMinorSigned(row.debt || 0) - toMinorSigned(row.credit || 0);
      buckets[key] -= sign * amt;
      continue;
    }
  }

  const lines: TrendyolPayoutBreakdownLine[] = TRENDYOL_PAYOUT_LINE_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    description: def.description,
    amountMinor: buckets[def.key],
  }));

  return {
    paymentOrderId,
    lines,
    computedNetMinor: lines.reduce((s, l) => s + l.amountMinor, 0),
    orderNumbers,
    rawRowCount: rows.length,
    errors,
  };
}

export async function fetchTrendyolPayoutBreakdown(
  creds: TrendyolCredentials,
  paymentOrderId: number,
): Promise<TrendyolPayoutBreakdown> {
  const { rows, errors } = await fetchTrendyolPaymentOrderBundle(creds, paymentOrderId, {
    settlementTypes: SETTLEMENT_TYPES,
    otherTypes: OTHER_TYPES,
  });
  return aggregateTrendyolPayoutBreakdown(paymentOrderId, rows, errors);
}

export function breakdownToNotesPayload(
  breakdown: TrendyolPayoutBreakdown,
  orderIds: string[] = [],
): {
  paymentOrderId: number;
  expectedNetMinor: number;
  orderIds: string[];
  orderNumbers: string[];
  breakdown: { key: TrendyolPayoutLineKey; label: string; amountMinor: number }[];
  breakdownSource: "trendyol_che";
} {
  return {
    paymentOrderId: breakdown.paymentOrderId,
    expectedNetMinor: breakdown.computedNetMinor,
    orderIds,
    orderNumbers: breakdown.orderNumbers,
    breakdown: breakdown.lines.map((l) => ({
      key: l.key,
      label: l.label,
      amountMinor: l.amountMinor,
    })),
    breakdownSource: "trendyol_che",
  };
}
