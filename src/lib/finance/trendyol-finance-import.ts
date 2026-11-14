import "server-only";

import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { getIntegrationConfig } from "@/lib/marketplace/actions";
import { marketplacePackageRef } from "@/lib/marketplace/types";
import {
  fetchTrendyolFinanceRange,
  fetchTrendyolOtherFinancials,
  fetchTrendyolSettlements,
  tryAmountToMinor,
  type TrendyolFinancialRow,
} from "@/lib/marketplace/trendyol/finance-api";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import {
  breakdownToNotesPayload,
  fetchTrendyolPayoutBreakdown,
  type TrendyolPayoutBreakdown,
  type TrendyolPayoutLineKey,
} from "@/lib/finance/trendyol-payout-breakdown";
import {
  TY_PAYOUT_ADVERTISING_NOTE,
  TY_PAYOUT_CARGO_NOTE,
  TY_PAYOUT_MICRO_EXPORT_NOTE,
  TY_PAYOUT_OTHER_NOTE,
  TY_PAYOUT_PENALTY_NOTE,
  TY_PAYOUT_PLATFORM_NOTE,
  TY_PAYOUT_STOPPAGE_NOTE,
  TY_SETTLEMENT_COMMISSION_NOTE,
} from "@/lib/finance/trendyol-deduction-notes";
import { prisma } from "@/lib/prisma";

export type TrendyolFinanceImportResult = {
  payouts: { created: number; skipped: number };
  deductions: { created: number; skipped: number; linked: number };
  commissionsPosted: number;
  payoutDeductionsAllocated: number;
  ordersTagged: number;
  errors: string[];
  message: string;
};

type PaymentOrderMeta = {
  paymentOrderId: number;
  expectedNetMinor: number;
  orderIds: string[];
  orderNumbers: string[];
};

type OrderCommissionSummary = {
  orderNumber: string;
  shipmentPackageId: number | null;
  /** Split model — CommissionNegative satırlarından */
  commissionMinor: number;
  /** Sale model — Sale/İndirim satırlarındaki net commissionAmount */
  saleCommissionMinor: number;
};

function normalizeTyType(type: string): string {
  return type.toLocaleLowerCase("tr-TR");
}

function isCancelType(type: string): boolean {
  const t = normalizeTyType(type);
  return t.includes("cancel") || t.includes("iptal");
}

/** Settlement satırlarından sipariş bazında GERÇEK komisyonu toplar (EN + TR etiket). */
function buildOrderCommissionSummary(
  settlements: TrendyolFinancialRow[],
): Map<string, OrderCommissionSummary> {
  const map = new Map<string, OrderCommissionSummary>();

  for (const row of settlements) {
    const orderNumber = row.orderNumber?.trim();
    if (!orderNumber) continue;

    const entry = map.get(orderNumber) ?? {
      orderNumber,
      shipmentPackageId: row.shipmentPackageId ?? null,
      commissionMinor: 0,
      saleCommissionMinor: 0,
    };
    if (entry.shipmentPackageId == null && row.shipmentPackageId != null) {
      entry.shipmentPackageId = row.shipmentPackageId;
    }

    const type = row.transactionType;
    const typeNorm = normalizeTyType(type);
    const cancel = isCancelType(type);
    const sign = cancel ? -1 : 1;

    if (typeNorm.includes("commission") || typeNorm.includes("komisyon")) {
      const amt = tryAmountToMinor(row.debt) || tryAmountToMinor(row.commissionAmount ?? 0);
      // CommissionNegative → kesinti artar; CommissionPositive → azalır
      if (typeNorm.includes("positive") || typeNorm.includes("pozitif")) {
        entry.commissionMinor -= sign * amt;
      } else {
        entry.commissionMinor += sign * amt;
      }
    } else if (
      typeNorm === "sale" ||
      typeNorm === "satış" ||
      typeNorm === "satis" ||
      typeNorm.includes("sellerrevenue") ||
      typeNorm.includes("hakediş") ||
      typeNorm.includes("hakedis")
    ) {
      entry.saleCommissionMinor += sign * tryAmountToMinor(row.commissionAmount ?? 0);
    } else if (
      typeNorm === "return" ||
      typeNorm === "iade" ||
      typeNorm.includes("discount") ||
      typeNorm.includes("indirim") ||
      typeNorm.includes("coupon") ||
      typeNorm.includes("kupon")
    ) {
      // İndirim/iadede komisyon düşer
      entry.saleCommissionMinor -= sign * tryAmountToMinor(row.commissionAmount ?? 0);
    }

    map.set(orderNumber, entry);
  }

  return map;
}

/** Split modelde Commission* , aksi halde Sale/İndirim net commissionAmount. */
function resolveRealCommissionMinor(summary: OrderCommissionSummary): number {
  const value =
    summary.commissionMinor !== 0 ? summary.commissionMinor : summary.saleCommissionMinor;
  return value > 0 ? value : 0;
}

function payoutRef(paymentOrderId: number | string): string {
  return `paymentOrder:${paymentOrderId}`;
}

function deductionRef(txId: string): string {
  return `deductionTx:${txId}`;
}

async function findTrendyolOrder(
  siteId: string,
  row: Pick<TrendyolFinancialRow, "orderNumber" | "shipmentPackageId">,
) {
  if (row.shipmentPackageId) {
    const byPackage = await prisma.storeOrder.findFirst({
      where: {
        siteId,
        marketplacePlatform: "trendyol",
        marketplaceRef: marketplacePackageRef("trendyol", row.shipmentPackageId),
      },
    });
    if (byPackage) return byPackage;
  }

  const orderNumber = row.orderNumber?.trim();
  if (!orderNumber) return null;

  return prisma.storeOrder.findFirst({
    where: {
      siteId,
      marketplacePlatform: "trendyol",
      OR: [
        { orderNumber: { startsWith: `TY-${orderNumber}-` } },
        { adminNotes: { contains: `Trendyol sipariş ${orderNumber}` } },
      ],
    },
  });
}

function parseOrderMeta(raw: string | null): Record<string, unknown> {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function tagOrderPaymentOrderId(
  siteId: string,
  orderId: string,
  paymentOrderId: number,
  metaJson: string | null,
): Promise<boolean> {
  const meta = parseOrderMeta(metaJson);
  if (meta.paymentOrderId === paymentOrderId) return false;
  meta.paymentOrderId = paymentOrderId;
  await prisma.storeOrder.update({
    where: { id: orderId },
    data: { marketplaceMetaJson: JSON.stringify(meta) },
  });
  return true;
}

function buildPaymentOrderSummary(
  settlements: TrendyolFinancialRow[],
): Map<number, PaymentOrderMeta> {
  const map = new Map<number, PaymentOrderMeta>();

  for (const row of settlements) {
    if (!row.paymentOrderId || !row.orderNumber) continue;
    const entry = map.get(row.paymentOrderId) ?? {
      paymentOrderId: row.paymentOrderId,
      expectedNetMinor: 0,
      orderIds: [],
      orderNumbers: [],
    };

    if (row.sellerRevenue != null && row.sellerRevenue > 0) {
      entry.expectedNetMinor += tryAmountToMinor(row.sellerRevenue);
    }
    if (row.commissionAmount != null && row.commissionAmount > 0) {
      entry.expectedNetMinor -= tryAmountToMinor(row.commissionAmount);
    }
    if (row.transactionType.includes("CommissionNegative") && row.debt > 0) {
      entry.expectedNetMinor -= tryAmountToMinor(row.debt);
    }
    if (row.transactionType.includes("SellerRevenuePositive") && row.credit > 0) {
      entry.expectedNetMinor += tryAmountToMinor(row.credit);
    }

    if (!entry.orderNumbers.includes(row.orderNumber)) {
      entry.orderNumbers.push(row.orderNumber);
    }
    map.set(row.paymentOrderId, entry);
  }

  return map;
}

export async function importTrendyolFinance(
  siteId: string,
  options: { sinceDays?: number } = {},
): Promise<TrendyolFinanceImportResult> {
  await ensureFinanceDefaults(siteId);

  const config = await getIntegrationConfig(siteId, "trendyol");
  const creds = parseTrendyolConfig(config);
  if (!creds) {
    return {
      payouts: { created: 0, skipped: 0 },
      deductions: { created: 0, skipped: 0, linked: 0 },
      commissionsPosted: 0,
      payoutDeductionsAllocated: 0,
      ordersTagged: 0,
      errors: ["Trendyol API bilgileri eksik (Pazaryeri ayarları)"],
      message: "Trendyol API yapılandırılmamış",
    };
  }

  const sinceDays = options.sinceDays ?? 30;
  const endMs = Date.now();
  const startMs = endMs - sinceDays * 86400000;

  const settlementTypes = [
    "Sale",
    "Return",
    "Discount",
    "Coupon",
    "SellerRevenuePositive",
    "SellerRevenueNegative",
    "CommissionNegative",
    "CommissionPositive",
  ];

  const settlementResult = await fetchTrendyolFinanceRange(
    creds,
    fetchTrendyolSettlements,
    settlementTypes,
    startMs,
    endMs,
  );

  const paymentOrderSummary = buildPaymentOrderSummary(settlementResult.rows);
  const orderCommissionSummary = buildOrderCommissionSummary(settlementResult.rows);
  let ordersTagged = 0;

  for (const row of settlementResult.rows) {
    if (!row.paymentOrderId) continue;
    const order = await findTrendyolOrder(siteId, row);
    if (!order) continue;
    const summary = paymentOrderSummary.get(row.paymentOrderId);
    if (summary && !summary.orderIds.includes(order.id)) {
      summary.orderIds.push(order.id);
    }
    const tagged = await tagOrderPaymentOrderId(
      siteId,
      order.id,
      row.paymentOrderId,
      order.marketplaceMetaJson,
    );
    if (tagged) ordersTagged += 1;
  }

  const payoutResult = await fetchTrendyolFinanceRange(
    creds,
    fetchTrendyolOtherFinancials,
    ["PaymentOrder"],
    startMs,
    endMs,
  );

  const deductionResult = await fetchTrendyolFinanceRange(
    creds,
    fetchTrendyolOtherFinancials,
    ["DeductionInvoices"],
    startMs,
    endMs,
  );

  const errors = [
    ...settlementResult.errors,
    ...payoutResult.errors,
    ...deductionResult.errors,
  ];

  const payoutCategory = await prisma.financeCategory.findFirst({
    where: { siteId, kind: "income", name: "Pazaryeri satış" },
  });
  const deductionCategory = await prisma.financeCategory.findFirst({
    where: { siteId, kind: "expense", name: "Pazaryeri komisyon / indirim faturası" },
  });
  const trendyolAccount = await prisma.financeAccount.findFirst({
    where: { siteId, kind: "marketplace_receivable", platform: "trendyol" },
  });
  const bankAccount = await prisma.financeAccount.findFirst({
    where: { siteId, kind: "bank" },
  });

  // Settlement'tan gelen GERÇEK komisyonu yaz; yalnızca "Tahmini komisyon" silinsin
  // (kargo / platform tahminleri kalsın — PO dağıtımı veya fatura gelene kadar).
  let commissionsPosted = 0;

  for (const summary of orderCommissionSummary.values()) {
    const realCommissionMinor = resolveRealCommissionMinor(summary);
    if (realCommissionMinor <= 0) continue;

    const order = await findTrendyolOrder(siteId, {
      orderNumber: summary.orderNumber,
      shipmentPackageId: summary.shipmentPackageId,
    });
    if (!order) continue;

    const income = await prisma.financeTransaction.findFirst({
      where: { siteId, orderId: order.id, kind: "sale_income" },
      select: { id: true },
    });

    await prisma.financeTransaction.deleteMany({
      where: {
        siteId,
        orderId: order.id,
        kind: "marketplace_deduction",
        OR: [
          { notes: TY_SETTLEMENT_COMMISSION_NOTE },
          {
            reconciliationStatus: "estimated",
            description: { startsWith: "Tahmini komisyon" },
          },
        ],
      },
    });

    await prisma.financeTransaction.create({
      data: {
        siteId,
        txDate: new Date(),
        kind: "marketplace_deduction",
        amountMinor: realCommissionMinor,
        categoryId: deductionCategory?.id,
        accountId: trendyolAccount?.id,
        orderId: order.id,
        linkedTxId: income?.id ?? null,
        description: `Trendyol gerçek komisyon — ${order.orderNumber}`,
        marketplacePlatform: "trendyol",
        marketplaceRef: `settlementCommission:${order.id}`,
        reconciliationStatus: "matched",
        notes: TY_SETTLEMENT_COMMISSION_NOTE,
      },
    });

    if (income) {
      await prisma.financeTransaction.update({
        where: { id: income.id },
        data: { reconciliationStatus: "matched" },
      });
    }

    commissionsPosted += 1;
  }

  let payoutDeductionsAllocated = 0;

  let payoutsCreated = 0;
  let payoutsSkippedExisting = 0;
  let payoutsSkippedZero = 0;
  let payoutsBreakdownUpdated = 0;
  let payoutIndex = 0;

  for (const row of payoutResult.rows) {
    if (payoutIndex > 0) {
      // Ödeme emirleri arasında kısa bekleme — CHE 429
      await new Promise((r) => setTimeout(r, 800));
    }
    payoutIndex += 1;
    const paymentOrderId = row.paymentOrderId ?? Number(row.id.replace(/\D/g, "") || 0);
    const ref = payoutRef(paymentOrderId || row.id);
    const existing = await prisma.financeTransaction.findFirst({
      where: {
        siteId,
        kind: "marketplace_payout",
        marketplacePlatform: "trendyol",
        marketplaceRef: ref,
      },
    });

    // PaymentOrder satırlarında tutar `debt` alanında gelir (credit/sellerRevenue boş).
    // Örn. "TRENDYOL Marketplace Ödeme" → debt: 331.58, credit: 0
    const amountMinor = tryAmountToMinor(
      row.credit || row.sellerRevenue || row.debt || 0,
    );

    const summary = paymentOrderId ? paymentOrderSummary.get(paymentOrderId) : undefined;
    const txDate = new Date(row.paymentDate || row.transactionDate || Date.now());

    let notesPayload: Record<string, unknown> | null = paymentOrderId
      ? {
          paymentOrderId,
          expectedNetMinor: summary?.expectedNetMinor,
          orderIds: summary?.orderIds ?? [],
          orderNumbers: summary?.orderNumbers ?? [],
        }
      : null;

    if (paymentOrderId) {
      try {
        const breakdown = await fetchTrendyolPayoutBreakdown(creds, paymentOrderId);
        const rateLimited = breakdown.errors.some((e) => e.includes("HTTP 429"));
        const delta = Math.abs(amountMinor - breakdown.computedNetMinor);
        // Eksik/429 kırılımı kaydetme — önceki doğru notes'u bozma
        if (!rateLimited && breakdown.rawRowCount > 0 && (amountMinor <= 0 || delta <= 200)) {
          const orderIds = summary?.orderIds?.length
            ? summary.orderIds
            : (notesPayload?.orderIds as string[] | undefined) ?? [];
          notesPayload = {
            ...breakdownToNotesPayload(breakdown, orderIds),
            orderIds,
          };
          const allocated = await allocatePayoutBreakdownToOrders(
            siteId,
            paymentOrderId,
            breakdown,
            orderIds,
            {
              deductionCategoryId: deductionCategory?.id,
              accountId: trendyolAccount?.id,
            },
          );
          payoutDeductionsAllocated += allocated;
        } else if (breakdown.errors.length) {
          errors.push(
            ...breakdown.errors
              .filter((e) => e.includes("HTTP 429"))
              .slice(0, 1)
              .map((e) => `paymentOrder ${paymentOrderId}: ${e}`),
          );
          if (!rateLimited) {
            errors.push(
              ...breakdown.errors
                .filter((e) => !e.includes("HTTP 429"))
                .slice(0, 3),
            );
          }
        }
      } catch (e) {
        errors.push(
          `paymentOrder ${paymentOrderId} kırılım: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    if (existing) {
      // Mevcut kayda yalnızca tutarlı partner paneli kırılımını yaz
      if (notesPayload && "breakdown" in notesPayload) {
        await prisma.financeTransaction.update({
          where: { id: existing.id },
          data: {
            notes: JSON.stringify(notesPayload),
            reconciliationStatus: summary?.orderIds.length
              ? "matched"
              : existing.reconciliationStatus,
          },
        });
        payoutsBreakdownUpdated += 1;
      }
      payoutsSkippedExisting += 1;
      continue;
    }

    if (amountMinor <= 0) {
      payoutsSkippedZero += 1;
      continue;
    }

    await prisma.financeTransaction.create({
      data: {
        siteId,
        txDate,
        kind: "marketplace_payout",
        amountMinor,
        categoryId: payoutCategory?.id,
        accountId: bankAccount?.id ?? trendyolAccount?.id,
        description: `Trendyol hakediş${paymentOrderId ? ` #${paymentOrderId}` : ""}`,
        marketplacePlatform: "trendyol",
        marketplaceRef: ref,
        reconciliationStatus: summary?.orderIds.length ? "matched" : "open",
        notes: notesPayload ? JSON.stringify(notesPayload) : null,
      },
    });
    payoutsCreated += 1;
  }

  let deductionsCreated = 0;
  let deductionsSkipped = 0;
  let deductionsLinked = 0;

  for (const row of deductionResult.rows) {
    const ref = deductionRef(row.id);
    const existing = await prisma.financeTransaction.findFirst({
      where: {
        siteId,
        kind: "marketplace_deduction",
        marketplacePlatform: "trendyol",
        marketplaceRef: ref,
      },
    });
    if (existing) {
      deductionsSkipped += 1;
      continue;
    }

    const amountMinor =
      tryAmountToMinor(row.debt) ||
      tryAmountToMinor(row.commissionAmount ?? 0);
    if (amountMinor <= 0) {
      deductionsSkipped += 1;
      continue;
    }

    const order = await findTrendyolOrder(siteId, row);
    const income = order
      ? await prisma.financeTransaction.findFirst({
          where: { siteId, orderId: order.id, kind: "sale_income" },
        })
      : null;

    await prisma.financeTransaction.create({
      data: {
        siteId,
        txDate: new Date(row.transactionDate || Date.now()),
        kind: "marketplace_deduction",
        amountMinor,
        categoryId: deductionCategory?.id,
        accountId: trendyolAccount?.id,
        orderId: order?.id ?? null,
        linkedTxId: income?.id ?? null,
        description:
          row.description?.trim() ||
          `Trendyol kesinti faturası${row.commissionInvoiceSerialNumber ? ` · ${row.commissionInvoiceSerialNumber}` : ""}`,
        invoiceDirection: "received",
        invoiceNumber: row.commissionInvoiceSerialNumber,
        counterpartyName: "Trendyol",
        marketplacePlatform: "trendyol",
        marketplaceRef: ref,
        reconciliationStatus: order ? "matched" : "unmatched",
      },
    });

    deductionsCreated += 1;
    if (order) {
      deductionsLinked += 1;
      if (income) {
        await prisma.financeTransaction.update({
          where: { id: income.id },
          data: { reconciliationStatus: "matched" },
        });
      }
    }
  }

  const payoutsSkipped = payoutsSkippedExisting + payoutsSkippedZero;
  const message = [
    commissionsPosted ? `${commissionsPosted} sipariş gerçek komisyonu` : null,
    payoutDeductionsAllocated
      ? `${payoutDeductionsAllocated} siparişe kargo/platform/stopaj dağıtıldı`
      : null,
    payoutsCreated ? `${payoutsCreated} hakediş` : null,
    payoutsBreakdownUpdated
      ? `${payoutsBreakdownUpdated} hakediş kırılımı güncellendi`
      : null,
    payoutsSkippedExisting && payoutsBreakdownUpdated === 0
      ? `${payoutsSkippedExisting} hakediş zaten kayıtlı`
      : null,
    payoutsSkippedZero ? `${payoutsSkippedZero} hakediş tutarsız (0 TL)` : null,
    deductionsCreated ? `${deductionsCreated} kesinti faturası` : null,
    deductionsLinked ? `${deductionsLinked} siparişe bağlandı` : null,
    ordersTagged ? `${ordersTagged} sipariş paymentOrderId ile işaretlendi` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    payouts: { created: payoutsCreated, skipped: payoutsSkipped },
    deductions: {
      created: deductionsCreated,
      skipped: deductionsSkipped,
      linked: deductionsLinked,
    },
    commissionsPosted,
    payoutDeductionsAllocated,
    ordersTagged,
    errors,
    message: message || "Yeni kayıt yok (dönem zaten içe aktarılmış olabilir)",
  };
}

const PAYOUT_LINE_ALLOCATION: {
  key: TrendyolPayoutLineKey;
  note: string;
  description: (orderNumber: string) => string;
  /** Silinecek tahmini açıklama öneki */
  clearEstimatedPrefix?: string;
}[] = [
  {
    key: "cargo",
    note: TY_PAYOUT_CARGO_NOTE,
    description: (n) => `Trendyol kargo kesintisi — ${n}`,
    clearEstimatedPrefix: "Tahmini kargo",
  },
  {
    key: "platformFee",
    note: TY_PAYOUT_PLATFORM_NOTE,
    description: (n) => `Trendyol platform hizmet bedeli — ${n}`,
    clearEstimatedPrefix: "Tahmini sabit",
  },
  {
    key: "stoppage",
    note: TY_PAYOUT_STOPPAGE_NOTE,
    description: (n) => `Trendyol e-ticaret stopajı — ${n}`,
  },
  {
    key: "penalty",
    note: TY_PAYOUT_PENALTY_NOTE,
    description: (n) => `Trendyol ceza kesintisi — ${n}`,
  },
  {
    key: "advertising",
    note: TY_PAYOUT_ADVERTISING_NOTE,
    description: (n) => `Trendyol reklam harcaması — ${n}`,
  },
  {
    key: "microExportReturn",
    note: TY_PAYOUT_MICRO_EXPORT_NOTE,
    description: (n) => `Trendyol yurtdışı operasyon iade bedeli — ${n}`,
  },
  {
    key: "other",
    note: TY_PAYOUT_OTHER_NOTE,
    description: (n) => `Trendyol diğer kesinti — ${n}`,
  },
];

/**
 * Hakediş kırılımındaki komisyon dışı kalemleri bağlı siparişlere brüt oranıyla dağıtır.
 * Komisyon settlement satırından geldiği için burada yazılmaz.
 */
async function allocatePayoutBreakdownToOrders(
  siteId: string,
  paymentOrderId: number,
  breakdown: TrendyolPayoutBreakdown,
  knownOrderIds: string[],
  ctx: { deductionCategoryId?: string; accountId?: string },
): Promise<number> {
  const orders = await resolvePaymentOrderOrders(
    siteId,
    paymentOrderId,
    knownOrderIds,
    breakdown.orderNumbers,
  );
  if (orders.length === 0) return 0;

  const grossTotal = orders.reduce((s, o) => s + o.totalMinor, 0);
  if (grossTotal <= 0) return 0;

  let written = 0;

  for (const spec of PAYOUT_LINE_ALLOCATION) {
    const line = breakdown.lines.find((l) => l.key === spec.key);
    // Panelde kesintiler negatif; mutlak tutarı dağıt
    const totalAbs = line ? Math.abs(line.amountMinor) : 0;
    if (totalAbs <= 0) continue;

    let allocated = 0;
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i]!;
      const share =
        i === orders.length - 1
          ? totalAbs - allocated
          : Math.round((totalAbs * order.totalMinor) / grossTotal);
      allocated += share;
      if (share <= 0) continue;

      if (spec.clearEstimatedPrefix) {
        await prisma.financeTransaction.deleteMany({
          where: {
            siteId,
            orderId: order.id,
            kind: "marketplace_deduction",
            reconciliationStatus: "estimated",
            description: { startsWith: spec.clearEstimatedPrefix },
          },
        });
      }

      const ref = `payoutDeduction:${paymentOrderId}:${spec.key}:${order.id}`;
      await prisma.financeTransaction.deleteMany({
        where: {
          siteId,
          kind: "marketplace_deduction",
          OR: [{ marketplaceRef: ref }, { notes: spec.note, orderId: order.id }],
        },
      });

      const income = await prisma.financeTransaction.findFirst({
        where: { siteId, orderId: order.id, kind: "sale_income" },
        select: { id: true },
      });

      await prisma.financeTransaction.create({
        data: {
          siteId,
          txDate: new Date(),
          kind: "marketplace_deduction",
          amountMinor: share,
          categoryId: ctx.deductionCategoryId,
          accountId: ctx.accountId,
          orderId: order.id,
          linkedTxId: income?.id ?? null,
          description: spec.description(order.orderNumber),
          marketplacePlatform: "trendyol",
          marketplaceRef: ref,
          reconciliationStatus: "matched",
          notes: spec.note,
        },
      });
      written += 1;
    }
  }

  return written;
}

async function resolvePaymentOrderOrders(
  siteId: string,
  paymentOrderId: number,
  knownOrderIds: string[],
  orderNumbers: string[],
): Promise<{ id: string; orderNumber: string; totalMinor: number }[]> {
  const byId = new Map<string, { id: string; orderNumber: string; totalMinor: number }>();

  if (knownOrderIds.length) {
    const rows = await prisma.storeOrder.findMany({
      where: { siteId, id: { in: knownOrderIds } },
      select: { id: true, orderNumber: true, totalMinor: true },
    });
    for (const r of rows) byId.set(r.id, r);
  }

  // Meta'da paymentOrderId işaretli siparişler
  const tagged = await prisma.storeOrder.findMany({
    where: {
      siteId,
      marketplacePlatform: "trendyol",
      marketplaceMetaJson: { contains: `"paymentOrderId":${paymentOrderId}` },
    },
    select: { id: true, orderNumber: true, totalMinor: true, marketplaceMetaJson: true },
  });
  for (const r of tagged) {
    try {
      const meta = JSON.parse(r.marketplaceMetaJson || "{}") as { paymentOrderId?: number };
      if (meta.paymentOrderId === paymentOrderId) {
        byId.set(r.id, {
          id: r.id,
          orderNumber: r.orderNumber,
          totalMinor: r.totalMinor,
        });
      }
    } catch {
      /* */
    }
  }

  for (const num of orderNumbers) {
    const hit = await findTrendyolOrder(siteId, {
      orderNumber: num,
      shipmentPackageId: null,
    });
    if (hit) {
      byId.set(hit.id, {
        id: hit.id,
        orderNumber: hit.orderNumber,
        totalMinor: hit.totalMinor,
      });
    }
  }

  return [...byId.values()];
}
