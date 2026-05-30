import { prisma } from "@/lib/prisma";
import {
  getIntegrationConfig,
  logMarketplaceAction,
  pullMarketplaceOrders,
} from "@/lib/marketplace/actions";
import { syncStockToAllMarketplaces } from "@/lib/marketplace/stock-sync-all";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function shouldPullNow(config: Record<string, string>, now = Date.now()): boolean {
  if (config.orderPullAuto !== "true") return false;
  const minutes = Math.max(5, parseInt(config.orderPullMinutes || "15", 10) || 15);
  const last = config.lastOrderPullAt ? new Date(config.lastOrderPullAt).getTime() : 0;
  return now - last >= minutes * 60 * 1000;
}

async function saveLastPull(integrationId: string, config: Record<string, string>) {
  const next = { ...config, lastOrderPullAt: new Date().toISOString() };
  await prisma.marketplaceIntegration.update({
    where: { id: integrationId },
    data: { configJson: JSON.stringify(next) },
  });
}

/** Ücretsiz zamanlama: Windows Görev Zamanlayıcı veya harici cron bu fonksiyonu tetikler. */
export async function runScheduledMarketplaceOrderPulls(options?: {
  force?: boolean;
  siteId?: string;
}): Promise<string[]> {
  const logs: string[] = [];
  const integrations = await prisma.marketplaceIntegration.findMany({
    where: {
      active: true,
      ...(options?.siteId ? { siteId: options.siteId } : {}),
    },
  });

  for (const integration of integrations) {
    const config = parseConfig(integration.configJson);
    if (!options?.force && !shouldPullNow(config)) {
      logs.push(`${integration.platform}@${integration.siteId}: atlandı (henüz süre dolmadı)`);
      continue;
    }

    const fullConfig = await getIntegrationConfig(integration.siteId, integration.platform);
    const startDate = fullConfig.lastOrderPullAt
      ? new Date(fullConfig.lastOrderPullAt).getTime() - 60_000
      : undefined;

    const result = await pullMarketplaceOrders(
      integration.siteId,
      integration.platform,
      fullConfig,
      "Created",
      startDate,
    );

    await logMarketplaceAction(integration.siteId, integration.platform, "pull_orders_cron", result);
    await saveLastPull(integration.id, fullConfig);

    if (result.itemsCount > 0) {
      await syncStockToAllMarketplaces(integration.siteId);
    }

    logs.push(`${integration.platform}@${integration.siteId}: ${result.message}`);
  }

  return logs;
}
