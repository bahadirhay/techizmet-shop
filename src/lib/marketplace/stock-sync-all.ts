import { prisma } from "@/lib/prisma";
import { toMarketplaceSyncPrices } from "@/lib/marketplace/product-prices";
import { syncTrendyolPriceAndInventory } from "@/lib/marketplace/trendyol/inventory";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import { syncProductsToHepsiburada } from "@/lib/marketplace/hepsiburada";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function syncOnePlatform(
  siteId: string,
  platform: string,
  config: Record<string, string>,
  productIds?: string[],
): Promise<{ ok: boolean; itemsCount: number; message: string }> {
  const products = await prisma.storeProduct.findMany({
    where: {
      siteId,
      published: true,
      ...(productIds?.length ? { id: { in: productIds } } : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      barcode: true,
      sku: true,
      priceMinor: true,
      compareAtMinor: true,
      marketplacePricesJson: true,
      stockQty: true,
    },
  });

  if (platform === "trendyol") {
    const creds = parseTrendyolConfig(config);
    if (!creds) return { ok: false, itemsCount: 0, message: "Trendyol API eksik" };
    const items = products
      .filter((p) => p.barcode?.trim())
      .map((p) => {
        const prices = toMarketplaceSyncPrices(p, platform);
        return {
          barcode: p.barcode!.trim(),
          quantity: p.stockQty,
          salePriceMinor: prices.salePriceMinor,
          listPriceMinor: prices.listPriceMinor,
        };
      });
    const result = await syncTrendyolPriceAndInventory(creds, items);
    return { ok: result.ok, itemsCount: result.sent, message: result.message };
  }

  if (platform === "hepsiburada") {
    const hbProducts = products.map((p) => ({
      ...p,
      priceMinor: toMarketplaceSyncPrices(p, "hepsiburada").salePriceMinor,
    }));
    const hb = await syncProductsToHepsiburada(hbProducts, config, { includeZeroStock: true });
    return { ok: hb.ok, itemsCount: hb.sent, message: hb.message };
  }

  return { ok: false, itemsCount: 0, message: `${platform} stok API henüz yok` };
}

/** Merkezi stok değişince tüm aktif pazaryerlerine stok/fiyat push. */
export async function syncStockToAllMarketplaces(
  siteId: string,
  productIds?: string[],
): Promise<{ ok: boolean; message: string; details: string[] }> {
  const integrations = await prisma.marketplaceIntegration.findMany({
    where: { siteId, active: true },
  });

  if (!integrations.length) {
    return { ok: true, message: "Aktif pazaryeri yok", details: [] };
  }

  const details: string[] = [];
  let anyOk = false;

  for (const integration of integrations) {
    const config = parseConfig(integration.configJson);
    if (config.stockSyncEnabled === "false") {
      details.push(`${integration.platform}: stok senkron kapalı`);
      continue;
    }

    const result = await syncOnePlatform(siteId, integration.platform, config, productIds);
    details.push(`${integration.platform}: ${result.message}`);
    if (result.ok) anyOk = true;

    await prisma.marketplaceSyncLog.create({
      data: {
        siteId,
        platform: integration.platform,
        action: "stock_sync_all",
        status: result.ok ? "success" : "error",
        message: result.message,
        itemsCount: result.itemsCount,
      },
    });
  }

  return {
    ok: anyOk || details.length === 0,
    message: details.join(" · ") || "Stok senkron tamam",
    details,
  };
}
