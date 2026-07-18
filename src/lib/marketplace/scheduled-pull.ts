import { prisma } from "@/lib/prisma";
import {
  getIntegrationConfig,
  logMarketplaceAction,
  pullMarketplaceOrders,
  syncMarketplaceInventory,
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

function shouldInventorySyncNow(config: Record<string, string>, now = Date.now()): boolean {
  if (config.inventorySyncAuto !== "true") return false;
  const minutes = Math.max(15, parseInt(config.inventorySyncMinutes || "60", 10) || 60);
  const last = config.lastInventorySyncAt ? new Date(config.lastInventorySyncAt).getTime() : 0;
  return now - last >= minutes * 60 * 1000;
}

async function patchIntegrationConfig(
  integrationId: string,
  config: Record<string, string>,
  patch: Record<string, string>,
) {
  const next = { ...config, ...patch };
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
    await patchIntegrationConfig(integration.id, fullConfig, {
      lastOrderPullAt: new Date().toISOString(),
    });

    if (result.itemsCount > 0) {
      await syncStockToAllMarketplaces(integration.siteId);
    }

    logs.push(`${integration.platform}@${integration.siteId}: ${result.message}`);
  }

  return logs;
}

/** Zamanlanmış stok/fiyat push — GitHub Actions / harici cron. */
export async function runScheduledMarketplaceInventorySync(options?: {
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
    if (!options?.force && !shouldInventorySyncNow(config)) {
      logs.push(
        `${integration.platform}@${integration.siteId}: stok atlandı (${
          config.inventorySyncAuto === "true" ? "süre dolmadı" : "inventorySyncAuto kapalı"
        })`,
      );
      continue;
    }

    const fullConfig = await getIntegrationConfig(integration.siteId, integration.platform);
    const result = await syncMarketplaceInventory(
      integration.siteId,
      integration.platform,
      fullConfig,
    );

    await logMarketplaceAction(integration.siteId, integration.platform, "inventory_sync_cron", result);
    await prisma.marketplaceIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: result.ok ? new Date() : integration.lastSyncAt,
        lastError: result.ok ? null : result.message,
      },
    });
    await patchIntegrationConfig(integration.id, fullConfig, {
      lastInventorySyncAt: new Date().toISOString(),
    });

    logs.push(`${integration.platform}@${integration.siteId}: ${result.message}`);
  }

  return logs;
}
