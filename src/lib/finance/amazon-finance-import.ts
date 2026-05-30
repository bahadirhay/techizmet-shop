import "server-only";

import type { MarketplaceFinanceImportResult } from "@/lib/finance/marketplace-finance-types";
import {
  createPayoutIfNew,
  findMarketplaceOrder,
  loadFinanceAccounts,
  tagOrderSettlementId,
} from "@/lib/finance/marketplace-finance-shared";
import { getIntegrationConfig } from "@/lib/marketplace/actions";
import {
  fetchAmazonFinancialEventGroups,
  fetchAmazonFinancialEventsByGroup,
  getAmazonAccessToken,
  parseAmazonConfig,
} from "@/lib/marketplace/amazon/client";

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
  const postedBefore = new Date();
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
  let ordersTagged = 0;

  for (const group of groupsResult.groups) {
    const payoutMinor = group.convertedTotalMinor || group.originalTotalMinor;
    if (payoutMinor <= 0) continue;

    const closed =
      group.processingStatus === "Closed" ||
      group.fundTransferStatus === "Succeeded" ||
      group.fundTransferStatus === "Processing";
    if (!closed && !group.fundTransferDate) continue;

    const eventsResult = await fetchAmazonFinancialEventsByGroup(
      creds,
      tokenResult.accessToken,
      group.financialEventGroupId,
    );
    if (eventsResult.error) errors.push(eventsResult.error);

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

    const expectedNetMinor = Math.max(
      0,
      eventsResult.events.shipmentNetMinor - eventsResult.events.feeMinor,
    );

    const result = await createPayoutIfNew({
      siteId,
      platform: "amazon_tr",
      marketplaceRef: `eventGroup:${group.financialEventGroupId}`,
      amountMinor: payoutMinor,
      txDate: group.fundTransferDate ?? new Date(),
      description: `Amazon hakediş · ${group.financialEventGroupId.slice(0, 12)}…`,
      accounts,
      reconciliationStatus: orderIds.length ? "matched" : "open",
      notes: JSON.stringify({
        financialEventGroupId: group.financialEventGroupId,
        expectedNetMinor: expectedNetMinor || null,
        orderIds,
        amazonOrderIds: eventsResult.events.amazonOrderIds,
        fundTransferStatus: group.fundTransferStatus,
      }),
    });
    if (result === "created") payoutsCreated += 1;
    else payoutsSkipped += 1;
  }

  const message = [
    payoutsCreated ? `${payoutsCreated} hakediş` : null,
    payoutsSkipped ? `${payoutsSkipped} atlandı` : null,
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
