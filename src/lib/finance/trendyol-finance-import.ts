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
import { prisma } from "@/lib/prisma";

export type TrendyolFinanceImportResult = {
  payouts: { created: number; skipped: number };
  deductions: { created: number; skipped: number; linked: number };
  commissionsPosted: number;
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
  /** Sale model — Sale satırlarındaki commissionAmount alanından */
  saleCommissionMinor: number;
};

/** Settlement satırlarından sipariş bazında GERÇEK komisyonu toplar. */
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
    const isCancel = type.includes("Cancel");
    if (type.includes("Commission")) {
      const amt = tryAmountToMinor(row.debt) || tryAmountToMinor(row.commissionAmount ?? 0);
      entry.commissionMinor += isCancel ? -amt : amt;
    } else if (type === "Sale" || type.includes("SellerRevenue")) {
      const amt = tryAmountToMinor(row.commissionAmount ?? 0);
      entry.saleCommissionMinor += isCancel ? -amt : amt;
    }

    map.set(orderNumber, entry);
  }

  return map;
}

/** Split modelde CommissionNegative, aksi halde Sale satırındaki commissionAmount. */
function resolveRealCommissionMinor(summary: OrderCommissionSummary): number {
  const value = summary.commissionMinor > 0 ? summary.commissionMinor : summary.saleCommissionMinor;
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
      ordersTagged: 0,
      errors: ["Trendyol API bilgileri eksik (Pazaryeri ayarları)"],
      message: "Trendyol API yapılandırılmamış",
    };
  }

  const sinceDays = options.sinceDays ?? 30;
  const endMs = Date.now();
  const startMs = endMs - sinceDays * 86400000;

  const settlementTypes = [
    "SellerRevenuePositive",
    "CommissionNegative",
    "Sale",
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

  // Settlement'tan gelen GERÇEK komisyonu sipariş bazında onaylı kesinti olarak yaz;
  // aynı siparişin otomatik tahminlerini sil ki raporlar tahmin yerine gerçeği kullansın.
  const SETTLEMENT_COMMISSION_NOTE = "trendyol-settlement-commission";
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
        OR: [{ reconciliationStatus: "estimated" }, { notes: SETTLEMENT_COMMISSION_NOTE }],
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
        notes: SETTLEMENT_COMMISSION_NOTE,
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

  let payoutsCreated = 0;
  let payoutsSkipped = 0;

  for (const row of payoutResult.rows) {
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
    if (existing) {
      payoutsSkipped += 1;
      continue;
    }

    const amountMinor = tryAmountToMinor(row.credit || row.sellerRevenue || 0);
    if (amountMinor <= 0) {
      payoutsSkipped += 1;
      continue;
    }

    const summary = paymentOrderId ? paymentOrderSummary.get(paymentOrderId) : undefined;
    const txDate = new Date(row.paymentDate || row.transactionDate || Date.now());

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
        notes: summary
          ? JSON.stringify({
              paymentOrderId,
              expectedNetMinor: summary.expectedNetMinor,
              orderIds: summary.orderIds,
              orderNumbers: summary.orderNumbers,
            })
          : paymentOrderId
            ? JSON.stringify({ paymentOrderId })
            : null,
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

  const message = [
    commissionsPosted ? `${commissionsPosted} sipariş gerçek komisyonu` : null,
    payoutsCreated ? `${payoutsCreated} hakediş` : null,
    payoutsSkipped ? `${payoutsSkipped} hakediş atlandı` : null,
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
    ordersTagged,
    errors,
    message: message || "Yeni kayıt yok (dönem zaten içe aktarılmış olabilir)",
  };
}
