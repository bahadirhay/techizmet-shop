import "server-only";

import type { MarketplaceFinanceImportResult } from "@/lib/finance/marketplace-finance-types";
import {
  findMarketplaceOrder,
  loadFinanceAccounts,
  tagOrderSettlementId,
  upsertMarketplacePayout,
} from "@/lib/finance/marketplace-finance-shared";
import { getIntegrationConfig } from "@/lib/marketplace/actions";
import {
  fetchAmazonFinancialEventGroups,
  fetchAmazonFinancialEventsByGroup,
  getAmazonAccessToken,
  parseAmazonConfig,
  type AmazonFinancialEventGroup,
} from "@/lib/marketplace/amazon/client";

type TransferOutcome = "succeeded" | "processing" | "failed" | "pending";

function classifyAmazonTransfer(group: AmazonFinancialEventGroup): TransferOutcome | null {
  const fund = (group.fundTransferStatus ?? "").toLowerCase();
  if (fund === "failed") return "failed";
  if (fund === "succeeded") return "succeeded";
  if (fund === "processing") return "processing";

  const processing = (group.processingStatus ?? "").toLowerCase();
  // Seller Central'da görünen bekleyen ödeme: Open veya Pending
  if (processing === "open" || processing === "pending") return "pending";

  if (processing === "closed") {
    // Closed ama transfer durumu yok/Unknown — tarih varsa geçmiş ödeme denemesi
    if (group.fundTransferDate) return "succeeded";
    return null;
  }

  if (group.fundTransferDate) return "processing";
  return null;
}

function outcomeMeta(outcome: TransferOutcome): {
  reconciliationStatus: string;
  descriptionPrefix: string;
} {
  switch (outcome) {
    case "failed":
      return {
        reconciliationStatus: "failed",
        descriptionPrefix: "Amazon hakediş (transfer başarısız)",
      };
    case "pending":
      return {
        reconciliationStatus: "pending",
        descriptionPrefix: "Amazon hakediş (bekleyen)",
      };
    case "processing":
      return {
        reconciliationStatus: "pending",
        descriptionPrefix: "Amazon hakediş (işleniyor)",
      };
    case "succeeded":
      return {
        reconciliationStatus: "matched",
        descriptionPrefix: "Amazon hakediş",
      };
  }
}

export async function importAmazonFinance(
  siteId: string,
  options: { sinceDays?: number } = {},
): Promise<MarketplaceFinanceImportResult> {
  const config = await getIntegrationConfig(siteId, "amazon_tr");
  const creds = parseAmazonConfig(config);
  if (!creds) {
    return {
      platform: "amazon_tr",
      payouts: { created: 0, skipped: 0 },
      deductions: { created: 0, skipped: 0, linked: 0 },
      ordersTagged: 0,
      errors: [
        "Amazon SP-API bilgileri eksik (sellerId, LWA client id/secret, refresh token). Pazaryeri → Amazon ayarlarından girin.",
      ],
      message: "Amazon SP-API yapılandırılmamış",
    };
  }

  const tokenResult = await getAmazonAccessToken(creds);
  if (!tokenResult.accessToken) {
    return {
      platform: "amazon_tr",
      payouts: { created: 0, skipped: 0 },
      deductions: { created: 0, skipped: 0, linked: 0 },
      ordersTagged: 0,
      errors: [tokenResult.error ?? "Amazon access token alınamadı"],
      message: "Amazon kimlik doğrulama başarısız",
    };
  }

  const sinceDays = options.sinceDays ?? 30;
  // Amazon: StartedBefore, sunucu saatine göre "şimdiden en fazla ~2 dk ileride" olabilir.
  // Vercel/yerel saat Amazon'dan öndeyse `new Date()` InvalidInput verir — 5 dk geri çek.
  const postedBefore = new Date(Date.now() - 5 * 60_000);
  const postedAfter = new Date(postedBefore.getTime() - sinceDays * 86400000);
  const accounts = await loadFinanceAccounts(siteId, "amazon_tr");
  const errors: string[] = [];

  const groupsResult = await fetchAmazonFinancialEventGroups(
    creds,
    tokenResult.accessToken,
    postedAfter,
    postedBefore,
  );
  if (groupsResult.error) errors.push(groupsResult.error);

  let payoutsCreated = 0;
  let payoutsSkipped = 0;
  let payoutsUpdated = 0;
  let ordersTagged = 0;
  let pendingCount = 0;
  let failedCount = 0;

  for (const group of groupsResult.groups) {
    const outcome = classifyAmazonTransfer(group);
    if (!outcome) continue;

    const eventsResult = await fetchAmazonFinancialEventsByGroup(
      creds,
      tokenResult.accessToken,
      group.financialEventGroupId,
    );
    if (eventsResult.error) errors.push(eventsResult.error);

    const expectedNetMinor = Math.max(
      0,
      eventsResult.events.shipmentNetMinor - eventsResult.events.feeMinor,
    );

    // Closed gruplarda OriginalTotal bazen null gelir — event netine düş.
    const payoutMinor =
      group.convertedTotalMinor || group.originalTotalMinor || expectedNetMinor;
    if (payoutMinor <= 0) continue;

    const orderIds: string[] = [];
    for (const amazonOrderId of eventsResult.events.amazonOrderIds) {
      const order = await findMarketplaceOrder(siteId, "amazon_tr", {
        orderNumber: amazonOrderId,
      });
      if (!order) continue;
      orderIds.push(order.id);
      const tagged = await tagOrderSettlementId(
        siteId,
        order.id,
        "financialEventGroupId",
        group.financialEventGroupId,
        order.marketplaceMetaJson,
      );
      if (tagged) ordersTagged += 1;
    }

    const { reconciliationStatus, descriptionPrefix } = outcomeMeta(outcome);
    const statusForOrders =
      outcome === "succeeded"
        ? orderIds.length
          ? "matched"
          : "open"
        : reconciliationStatus;

    if (outcome === "pending" || outcome === "processing") pendingCount += 1;
    if (outcome === "failed") failedCount += 1;

    const result = await upsertMarketplacePayout({
      siteId,
      platform: "amazon_tr",
      marketplaceRef: `eventGroup:${group.financialEventGroupId}`,
      amountMinor: payoutMinor,
      txDate: group.fundTransferDate ?? group.groupStart ?? new Date(),
      description: `${descriptionPrefix} · ${group.financialEventGroupId.slice(0, 12)}…`,
      accounts,
      reconciliationStatus: statusForOrders,
      notes: JSON.stringify({
        financialEventGroupId: group.financialEventGroupId,
        expectedNetMinor: expectedNetMinor || null,
        orderIds,
        amazonOrderIds: eventsResult.events.amazonOrderIds,
        fundTransferStatus: group.fundTransferStatus,
        processingStatus: group.processingStatus,
        transferOutcome: outcome,
      }),
    });
    if (result === "created") payoutsCreated += 1;
    else if (result === "updated") payoutsUpdated += 1;
    else payoutsSkipped += 1;
  }

  const message = [
    payoutsCreated ? `${payoutsCreated} hakediş` : null,
    payoutsUpdated ? `${payoutsUpdated} güncellendi` : null,
    payoutsSkipped ? `${payoutsSkipped} atlandı` : null,
    pendingCount ? `${pendingCount} bekleyen` : null,
    failedCount ? `${failedCount} başarısız transfer` : null,
    ordersTagged ? `${ordersTagged} sipariş işaretlendi` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    platform: "amazon_tr",
    payouts: { created: payoutsCreated, skipped: payoutsSkipped },
    deductions: { created: 0, skipped: 0, linked: 0 },
    ordersTagged,
    errors,
    message: message || "Yeni hakediş kaydı yok",
  };
}
