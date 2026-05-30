import "server-only";

import type { MarketplaceFinanceImportResult } from "@/lib/finance/marketplace-finance-types";
import {
  createDeductionIfNew,
  createPayoutIfNew,
  findMarketplaceOrder,
  loadFinanceAccounts,
  tagOrderSettlementId,
} from "@/lib/finance/marketplace-finance-shared";
import { getIntegrationConfig } from "@/lib/marketplace/actions";
import {
  fetchHepsiburadaTransactions,
  formatHbDate,
  parseHepsiburadaFinanceConfig,
  type HepsiburadaFinanceRow,
} from "@/lib/marketplace/hepsiburada/finance-api";
import { prisma } from "@/lib/prisma";

const DEDUCTION_TYPES = new Set([
  "Commission",
  "CommissionSettlementTransactions",
  "InvoiceTransactions",
  "ShipmentCostSharingExpense",
  "ProcessingFeeExpense",
  "DeliveryProcessingFee",
  "PaymentServiceCostReflection",
  "Stoppage",
  "MarketingExpense",
  "AdSharingExpense",
]);

function settlementKey(row: HepsiburadaFinanceRow): string {
  return row.settlementId || row.paymentReference || row.referenceDocument || row.id;
}

function signedMinor(row: HepsiburadaFinanceRow): number {
  if (row.isIncome) return row.amountMinor;
  if (row.isInvoice || DEDUCTION_TYPES.has(row.transactionType)) return -row.amountMinor;
  if (row.transactionType === "Payment") return row.amountMinor;
  if (row.transactionType === "Return") return -row.amountMinor;
  return row.isIncome ? row.amountMinor : -row.amountMinor;
}

export async function importHepsiburadaFinance(
  siteId: string,
  options: { sinceDays?: number } = {},
): Promise<MarketplaceFinanceImportResult> {
  const config = await getIntegrationConfig(siteId, "hepsiburada");
  const creds = parseHepsiburadaFinanceConfig(config);
  if (!creds) {
    return {
      platform: "hepsiburada",
      payouts: { created: 0, skipped: 0 },
      deductions: { created: 0, skipped: 0, linked: 0 },
      ordersTagged: 0,
      errors: ["Hepsiburada API bilgileri eksik (merchant ID, API Key, Secret)"],
      message: "Hepsiburada API yapılandırılmamış",
    };
  }

  const sinceDays = options.sinceDays ?? 30;
  const end = new Date();
  const start = new Date(end.getTime() - sinceDays * 86400000);
  const accounts = await loadFinanceAccounts(siteId, "hepsiburada");
  const errors: string[] = [];

  const paidResult = await fetchHepsiburadaTransactions(creds, {
    paymentDateStart: formatHbDate(start),
    paymentDateEnd: formatHbDate(end),
    status: "Paid",
  });
  if (paidResult.error) errors.push(paidResult.error);

  const invoiceResult = await fetchHepsiburadaTransactions(creds, {
    paymentDateStart: formatHbDate(start),
    paymentDateEnd: formatHbDate(end),
    transactionTypes: "Commission,InvoiceTransactions,CommissionSettlementTransactions",
    status: "Paid",
  });
  if (invoiceResult.error) errors.push(invoiceResult.error);

  const allRows = [...paidResult.rows, ...invoiceResult.rows];
  const uniqueRows = new Map<string, HepsiburadaFinanceRow>();
  for (const row of allRows) uniqueRows.set(row.id, row);
  const rows = [...uniqueRows.values()];

  const settlementSummary = new Map<
    string,
    { netMinor: number; orderIds: string[]; orderNumbers: string[]; paymentDate: Date | null }
  >();

  let ordersTagged = 0;
  let payoutsCreated = 0;
  let payoutsSkipped = 0;
  let deductionsCreated = 0;
  let deductionsSkipped = 0;
  let deductionsLinked = 0;

  for (const row of rows) {
    const key = settlementKey(row);
    const summary = settlementSummary.get(key) ?? {
      netMinor: 0,
      orderIds: [],
      orderNumbers: [],
      paymentDate: row.paymentDate,
    };
    summary.netMinor += signedMinor(row);

    const order = await findMarketplaceOrder(siteId, "hepsiburada", {
      orderNumber: row.orderNumber,
      packageNumber: row.packageNumber,
    });

    if (order && row.orderNumber && !summary.orderNumbers.includes(row.orderNumber)) {
      summary.orderNumbers.push(row.orderNumber);
    }
    if (order && !summary.orderIds.includes(order.id)) {
      summary.orderIds.push(order.id);
      if (row.settlementId) {
        const tagged = await tagOrderSettlementId(
          siteId,
          order.id,
          "settlementId",
          row.settlementId,
          order.marketplaceMetaJson,
        );
        if (tagged) ordersTagged += 1;
      }
    }

    settlementSummary.set(key, summary);

    const isDeduction =
      row.isInvoice ||
      DEDUCTION_TYPES.has(row.transactionType) ||
      (!row.isIncome && row.transactionType !== "Payment");

    if (isDeduction && row.amountMinor > 0) {
      const income = order
        ? await prisma.financeTransaction.findFirst({
            where: { siteId, orderId: order.id, kind: "sale_income" },
          })
        : null;
      const result = await createDeductionIfNew({
        siteId,
        platform: "hepsiburada",
        marketplaceRef: `hbTx:${row.id}`,
        amountMinor: row.amountMinor,
        txDate: row.paymentDate ?? row.recordDate ?? new Date(),
        description:
          row.referenceDocument
            ? `Hepsiburada kesinti · ${row.referenceDocument}`
            : `Hepsiburada ${row.transactionType}`,
        accounts,
        orderId: order?.id,
        incomeTxId: income?.id,
        invoiceNumber: row.referenceDocument,
      });
      if (result === "created" || result === "linked") deductionsCreated += 1;
      else deductionsSkipped += 1;
      if (result === "linked") deductionsLinked += 1;
    }
  }

  for (const [key, summary] of settlementSummary) {
    if (summary.netMinor <= 0) continue;
    const result = await createPayoutIfNew({
      siteId,
      platform: "hepsiburada",
      marketplaceRef: `settlement:${key}`,
      amountMinor: summary.netMinor,
      txDate: summary.paymentDate ?? new Date(),
      description: `Hepsiburada hakediş · ${key}`,
      accounts,
      reconciliationStatus: summary.orderIds.length ? "matched" : "open",
      notes: JSON.stringify({
        settlementId: key,
        expectedNetMinor: summary.netMinor,
        orderIds: summary.orderIds,
        orderNumbers: summary.orderNumbers,
      }),
    });
    if (result === "created") payoutsCreated += 1;
    else payoutsSkipped += 1;
  }

  const message = [
    payoutsCreated ? `${payoutsCreated} hakediş` : null,
    deductionsCreated ? `${deductionsCreated} kesinti` : null,
    deductionsLinked ? `${deductionsLinked} siparişe bağlandı` : null,
    ordersTagged ? `${ordersTagged} sipariş işaretlendi` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    platform: "hepsiburada",
    payouts: { created: payoutsCreated, skipped: payoutsSkipped },
    deductions: { created: deductionsCreated, skipped: deductionsSkipped, linked: deductionsLinked },
    ordersTagged,
    errors,
    message: message || "Yeni kayıt yok",
  };
}
