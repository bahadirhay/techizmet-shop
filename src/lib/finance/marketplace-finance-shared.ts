import "server-only";

import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { marketplacePackageRef } from "@/lib/marketplace/types";
import { prisma } from "@/lib/prisma";

export function tryAmountToMinor(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

export function parseOrderMeta(raw: string | null): Record<string, unknown> {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function findMarketplaceOrder(
  siteId: string,
  platform: string,
  input: { orderNumber?: string | null; packageNumber?: string | null },
) {
  const orderNumber = input.orderNumber?.trim();
  const packageNumber = input.packageNumber?.trim();

  if (packageNumber) {
    const byPackage = await prisma.storeOrder.findFirst({
      where: {
        siteId,
        marketplacePlatform: platform,
        marketplaceRef: marketplacePackageRef(platform, packageNumber),
      },
    });
    if (byPackage) return byPackage;
  }

  if (orderNumber) {
    if (platform === "amazon_tr") {
      const byAmazonRef = await prisma.storeOrder.findFirst({
        where: {
          siteId,
          marketplacePlatform: "amazon_tr",
          marketplaceRef: `amazon_tr:order:${orderNumber}`,
        },
      });
      if (byAmazonRef) return byAmazonRef;
    }

    const prefix =
      platform === "trendyol"
        ? "TY"
        : platform === "hepsiburada"
          ? "HB"
          : platform === "amazon_tr"
            ? "AMZ"
            : platform.toUpperCase();

    const byNumber = await prisma.storeOrder.findFirst({
      where: {
        siteId,
        marketplacePlatform: platform,
        OR: [
          { orderNumber: { startsWith: `${prefix}-${orderNumber}` } },
          { orderNumber: orderNumber },
          { orderNumber: { contains: orderNumber } },
          { marketplaceRef: { contains: orderNumber } },
          { adminNotes: { contains: orderNumber } },
        ],
      },
    });
    if (byNumber) return byNumber;
  }

  return null;
}

export async function tagOrderSettlementId(
  siteId: string,
  orderId: string,
  key: "paymentOrderId" | "settlementId" | "financialEventGroupId",
  value: string | number,
  metaJson: string | null,
): Promise<boolean> {
  const meta = parseOrderMeta(metaJson);
  if (meta[key] === value) return false;
  meta[key] = value;
  await prisma.storeOrder.update({
    where: { id: orderId },
    data: { marketplaceMetaJson: JSON.stringify(meta) },
  });
  return true;
}

type FinanceAccounts = {
  payoutCategoryId?: string;
  deductionCategoryId?: string;
  platformAccountId?: string;
  bankAccountId?: string;
};

export async function loadFinanceAccounts(
  siteId: string,
  platform: string,
): Promise<FinanceAccounts> {
  await ensureFinanceDefaults(siteId);
  const [payoutCategory, deductionCategory, platformAccount, bankAccount] = await Promise.all([
    prisma.financeCategory.findFirst({
      where: { siteId, kind: "income", name: "Pazaryeri satış" },
    }),
    prisma.financeCategory.findFirst({
      where: { siteId, kind: "expense", name: "Pazaryeri komisyon / indirim faturası" },
    }),
    prisma.financeAccount.findFirst({
      where: { siteId, kind: "marketplace_receivable", platform },
    }),
    prisma.financeAccount.findFirst({
      where: { siteId, kind: "bank" },
    }),
  ]);
  return {
    payoutCategoryId: payoutCategory?.id,
    deductionCategoryId: deductionCategory?.id,
    platformAccountId: platformAccount?.id,
    bankAccountId: bankAccount?.id,
  };
}

export async function createPayoutIfNew(input: {
  siteId: string;
  platform: string;
  marketplaceRef: string;
  amountMinor: number;
  txDate: Date;
  description: string;
  accounts: FinanceAccounts;
  notes?: string | null;
  reconciliationStatus?: string;
}): Promise<"created" | "skipped"> {
  const existing = await prisma.financeTransaction.findFirst({
    where: {
      siteId: input.siteId,
      kind: "marketplace_payout",
      marketplacePlatform: input.platform,
      marketplaceRef: input.marketplaceRef,
    },
  });
  if (existing || input.amountMinor <= 0) return "skipped";

  await prisma.financeTransaction.create({
    data: {
      siteId: input.siteId,
      txDate: input.txDate,
      kind: "marketplace_payout",
      amountMinor: input.amountMinor,
      categoryId: input.accounts.payoutCategoryId,
      accountId: input.accounts.bankAccountId ?? input.accounts.platformAccountId,
      description: input.description,
      marketplacePlatform: input.platform,
      marketplaceRef: input.marketplaceRef,
      reconciliationStatus: input.reconciliationStatus ?? "open",
      notes: input.notes,
    },
  });
  return "created";
}

export async function createDeductionIfNew(input: {
  siteId: string;
  platform: string;
  marketplaceRef: string;
  amountMinor: number;
  txDate: Date;
  description: string;
  accounts: FinanceAccounts;
  orderId?: string | null;
  incomeTxId?: string | null;
  invoiceNumber?: string | null;
}): Promise<"created" | "skipped" | "linked"> {
  const existing = await prisma.financeTransaction.findFirst({
    where: {
      siteId: input.siteId,
      kind: "marketplace_deduction",
      marketplacePlatform: input.platform,
      marketplaceRef: input.marketplaceRef,
    },
  });
  if (existing || input.amountMinor <= 0) return "skipped";

  await prisma.financeTransaction.create({
    data: {
      siteId: input.siteId,
      txDate: input.txDate,
      kind: "marketplace_deduction",
      amountMinor: input.amountMinor,
      categoryId: input.accounts.deductionCategoryId,
      accountId: input.accounts.platformAccountId,
      orderId: input.orderId ?? null,
      linkedTxId: input.incomeTxId ?? null,
      description: input.description,
      invoiceDirection: "received",
      invoiceNumber: input.invoiceNumber,
      counterpartyName:
        input.platform === "trendyol"
          ? "Trendyol"
          : input.platform === "hepsiburada"
            ? "Hepsiburada"
            : input.platform === "amazon_tr"
              ? "Amazon"
              : input.platform,
      marketplacePlatform: input.platform,
      marketplaceRef: input.marketplaceRef,
      reconciliationStatus: input.orderId ? "matched" : "unmatched",
    },
  });

  if (input.orderId && input.incomeTxId) {
    await prisma.financeTransaction.update({
      where: { id: input.incomeTxId },
      data: { reconciliationStatus: "matched" },
    });
  }

  return input.orderId ? "linked" : "created";
}
