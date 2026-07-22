import { prisma } from "@/lib/prisma";
import type { MarketplaceActionResult } from "@/lib/marketplace/types";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import { importTrendyolPackages } from "@/lib/marketplace/trendyol/import-orders";
import { syncTrendyolPriceAndInventory } from "@/lib/marketplace/trendyol/inventory";
import {
  fetchTrendyolOrders,
  fetchAllTrendyolOrders,
  TRENDYOL_OPEN_STATUSES,
} from "@/lib/marketplace/trendyol/orders";
import {
  approveTrendyolPackage,
  invoiceTrendyolPackage,
} from "@/lib/marketplace/trendyol/packages";
import { sendTrendyolInvoiceLink } from "@/lib/marketplace/trendyol/invoices";
import { toMarketplaceSyncPrices } from "@/lib/marketplace/product-prices";
import { syncProductsToHepsiburada } from "@/lib/marketplace/hepsiburada";
import { parseHepsiburadaOmsConfig } from "@/lib/marketplace/hepsiburada/client";
import { fetchHepsiburadaPackages } from "@/lib/marketplace/hepsiburada/orders";
import { importHepsiburadaPackages } from "@/lib/marketplace/hepsiburada/import-orders";
import {
  getAmazonAccessToken,
  parseAmazonConfig,
  resolveAmazonMarketplaceId,
} from "@/lib/marketplace/amazon/client";
import { fetchAmazonOrders } from "@/lib/marketplace/amazon/orders";
import { importAmazonOrders } from "@/lib/marketplace/amazon/import-orders";
import { syncAmazonPriceAndInventory } from "@/lib/marketplace/amazon/inventory";
import { syncProductsToAmazon } from "@/lib/marketplace/amazon/products";
import { resolveAmazonListingSku } from "@/lib/marketplace/amazon/sku";
import { syncProductsToTrendyol } from "@/lib/marketplace/trendyol";
import { fetchTrendyolCatalog } from "@/lib/marketplace/trendyol/products";
import { fetchHepsiburadaCatalog } from "@/lib/marketplace/hepsiburada/products";
import { fetchAmazonCatalog } from "@/lib/marketplace/amazon/products";
import { importMarketplaceCatalog, upsertProductMarketplaceListing } from "@/lib/marketplace/catalog-import";
import { persistCatalogTitleCache } from "@/lib/marketplace/catalog-title-cache";
import { parseMarketplaceOrderMeta } from "@/lib/marketplace/types";
import { syncStockToAllMarketplaces } from "@/lib/marketplace/stock-sync-all";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function pullMarketplaceOrders(
  siteId: string,
  platform: string,
  config: Record<string, string>,
  status = "Created",
  startDate?: number,
): Promise<MarketplaceActionResult & { productIds?: string[] }> {
  if (platform === "trendyol") {
    const creds = parseTrendyolConfig(config);
    if (!creds) {
      return { ok: false, itemsCount: 0, message: "Trendyol API bilgileri eksik" };
    }
    // status === "all" → tüm statüler; "open" → Created/Picking/Invoiced (cron)
    const fetched =
      status === "all"
        ? await fetchAllTrendyolOrders(creds, { startDate })
        : status === "open"
          ? await fetchAllTrendyolOrders(creds, {
              statuses: TRENDYOL_OPEN_STATUSES,
              startDate,
              size: 50,
              maxPagesPerStatus: 10,
            })
          : await fetchTrendyolOrders(creds, { status, size: 50, startDate });
    if (!fetched.ok) return { ok: false, itemsCount: 0, message: fetched.message };
    const imported = await importTrendyolPackages(siteId, fetched.packages);
    if (imported.productIds.length) {
      await syncStockToAllMarketplaces(siteId, imported.productIds);
    }
    return {
      ok: true,
      itemsCount: imported.imported,
      message: `${fetched.message} · ${imported.message}`,
      productIds: imported.productIds,
    };
  }

  if (platform === "hepsiburada") {
    const creds = parseHepsiburadaOmsConfig(config);
    if (!creds) {
      return { ok: false, itemsCount: 0, message: "Hepsiburada API bilgileri eksik (merchant, key, secret)" };
    }
    const sinceDays = startDate
      ? Math.ceil((Date.now() - startDate) / 86400000)
      : 30;
    const fetched = await fetchHepsiburadaPackages(creds, { sinceDays });
    if (!fetched.ok && fetched.packages.length === 0) {
      return {
        ok: false,
        itemsCount: 0,
        message: fetched.errors.join(" · ") || "Hepsiburada sipariş alınamadı",
      };
    }
    const imported = await importHepsiburadaPackages(siteId, fetched.packages);
    if (imported.productIds.length) {
      await syncStockToAllMarketplaces(siteId, imported.productIds);
    }
    const errNote = fetched.errors.length ? ` · Uyarı: ${fetched.errors.slice(0, 2).join("; ")}` : "";
    return {
      ok: true,
      itemsCount: imported.imported,
      message: `${fetched.message} · ${imported.message}${errNote}`,
      productIds: imported.productIds,
    };
  }

  if (platform === "amazon_tr") {
    const creds = parseAmazonConfig(config);
    if (!creds) {
      return {
        ok: false,
        itemsCount: 0,
        message: "Amazon SP-API eksik (sellerId, LWA client, refresh token)",
      };
    }
    const token = await getAmazonAccessToken(creds);
    if (!token.accessToken) {
      return { ok: false, itemsCount: 0, message: token.error ?? "Amazon token alınamadı" };
    }
    const sinceDays = startDate ? Math.ceil((Date.now() - startDate) / 86400000) : 30;
    const marketplaceId = config.amazonMarketplaceId?.trim() || undefined;
    const fetched = await fetchAmazonOrders(creds, token.accessToken, { sinceDays, marketplaceId });
    if (!fetched.ok && fetched.orders.length === 0) {
      return {
        ok: false,
        itemsCount: 0,
        message: fetched.errors.join(" · ") || "Amazon sipariş alınamadı",
      };
    }
    const imported = await importAmazonOrders(siteId, fetched.orders);
    if (imported.productIds.length) {
      await syncStockToAllMarketplaces(siteId, imported.productIds);
    }
    const errNote = fetched.errors.length ? ` · Uyarı: ${fetched.errors.slice(0, 2).join("; ")}` : "";
    return {
      ok: true,
      itemsCount: imported.imported,
      message: `${fetched.message} · ${imported.message}${errNote}`,
      productIds: imported.productIds,
    };
  }

  return {
    ok: false,
    itemsCount: 0,
    message: `${platform} için sipariş çekme henüz bağlanmadı`,
  };
}

export async function syncMarketplaceInventory(
  siteId: string,
  platform: string,
  config: Record<string, string>,
  productIds?: string[],
): Promise<MarketplaceActionResult> {
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
      marketplaceMarkupPercentJson: true,
      stockQty: true,
    },
  });

  if (platform === "trendyol") {
    const creds = parseTrendyolConfig(config);
    if (!creds) {
      return { ok: false, itemsCount: 0, message: "Trendyol API bilgileri eksik" };
    }
    const items = products
      .filter((p) => p.barcode?.trim())
      .map((p) => {
        const prices = toMarketplaceSyncPrices(p, "trendyol");
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

  if (platform === "amazon_tr") {
    const creds = parseAmazonConfig(config);
    if (!creds) {
      return { ok: false, itemsCount: 0, message: "Amazon SP-API bilgileri eksik" };
    }
    const token = await getAmazonAccessToken(creds);
    if (!token.accessToken) {
      return { ok: false, itemsCount: 0, message: token.error ?? "Amazon token alınamadı" };
    }
    const marketplaceId = resolveAmazonMarketplaceId(config);
    const listings = await prisma.marketplaceProductListing.findMany({
      where: {
        siteId,
        platform: "amazon_tr",
        productId: { in: products.map((p) => p.id) },
      },
      select: { productId: true, metaJson: true },
    });
    const listingByProduct = new Map(listings.map((l) => [l.productId, l.metaJson]));
    const items = products
      .map((p) => {
        const sku = resolveAmazonListingSku(listingByProduct.get(p.id) ?? null, p);
        if (!sku.trim()) return null;
        const prices = toMarketplaceSyncPrices(p, "amazon_tr");
        return {
          sku,
          quantity: p.stockQty,
          salePriceMinor: prices.salePriceMinor,
          listPriceMinor: prices.listPriceMinor,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const result = await syncAmazonPriceAndInventory(creds, token.accessToken, marketplaceId, items, config);
    return { ok: result.ok, itemsCount: result.sent, message: result.message };
  }

  return {
    ok: false,
    itemsCount: 0,
    message: `${platform} için stok/fiyat API henüz yok`,
  };
}

export async function pushMarketplaceProducts(
  siteId: string,
  platform: string,
  config: Record<string, string>,
): Promise<MarketplaceActionResult> {
  const products = await prisma.storeProduct.findMany({
    where: { siteId, published: true },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" }, take: 8 },
    },
  });

  if (platform === "trendyol") {
    const tr = await syncProductsToTrendyol(products, config, siteId);
    return { ok: tr.ok, itemsCount: tr.sent, message: tr.message };
  }
  if (platform === "hepsiburada") {
    const hb = await syncProductsToHepsiburada(products, config, { siteId });
    return { ok: hb.ok, itemsCount: hb.sent, message: hb.message };
  }
  if (platform === "amazon_tr") {
    const az = await syncProductsToAmazon(products, config, siteId);
    return { ok: az.ok, itemsCount: az.sent, message: az.message };
  }

  const withStock = products.filter((p) => p.stockQty > 0).length;
  if (isXmlListingPlatform(platform)) {
    for (const p of products.filter((item) => item.stockQty > 0)) {
      await upsertProductMarketplaceListing(siteId, p.id, platform, {
        barcode: p.barcode?.trim() ?? null,
        listingStatus: "exported",
        contentSyncedAt: p.updatedAt,
      });
    }
  }
  return {
    ok: true,
    itemsCount: products.length,
    message: `${products.length} ürün (${withStock} stoklu). ${platform} canlı API yok; XML kullanın.`,
  };
}

function xmlListingPlatforms(): Set<string> {
  return new Set(["n11", "ciceksepeti", "pazarama"]);
}

function isXmlListingPlatform(platform: string): boolean {
  return xmlListingPlatforms().has(platform);
}

export async function pullMarketplaceCatalog(
  siteId: string,
  platform: string,
  config: Record<string, string>,
): Promise<MarketplaceActionResult & { matched?: number; unmatched?: number }> {
  if (platform === "trendyol") {
    const creds = parseTrendyolConfig(config);
    if (!creds) {
      return { ok: false, itemsCount: 0, message: "Trendyol API bilgileri eksik" };
    }
    const fetched = await fetchTrendyolCatalog(creds);
    if (!fetched.ok && fetched.items.length === 0) {
      return {
        ok: false,
        itemsCount: 0,
        message: fetched.errors.join(" · ") || fetched.message,
      };
    }
    const imported = await importMarketplaceCatalog(siteId, platform, fetched.items);
    const cached = await persistCatalogTitleCache(siteId, platform, fetched.items);
    const cacheNote = cached > 0 ? ` · ${cached} başlık SEO önbelleğine yazıldı` : "";
    const errNote = fetched.errors.length ? ` · Uyarı: ${fetched.errors.slice(0, 2).join("; ")}` : "";
    return {
      ok: imported.ok,
      itemsCount: imported.matched,
      matched: imported.matched,
      unmatched: imported.unmatched,
      message: `${fetched.message} · ${imported.message}${cacheNote}${errNote}`,
    };
  }

  if (platform === "hepsiburada") {
    const fetched = await fetchHepsiburadaCatalog(config);
    if (!fetched.ok && fetched.items.length === 0) {
      return {
        ok: false,
        itemsCount: 0,
        message: fetched.errors.join(" · ") || fetched.message,
      };
    }
    const imported = await importMarketplaceCatalog(siteId, platform, fetched.items);
    const errNote = fetched.errors.length ? ` · Uyarı: ${fetched.errors.slice(0, 2).join("; ")}` : "";
    return {
      ok: imported.ok,
      itemsCount: imported.matched,
      matched: imported.matched,
      unmatched: imported.unmatched,
      message: `${fetched.message} · ${imported.message}${errNote}`,
    };
  }

  if (platform === "amazon_tr") {
    const creds = parseAmazonConfig(config);
    if (!creds) {
      return { ok: false, itemsCount: 0, message: "Amazon SP-API bilgileri eksik" };
    }
    const token = await getAmazonAccessToken(creds);
    if (!token.accessToken) {
      return { ok: false, itemsCount: 0, message: token.error ?? "Amazon token alınamadı" };
    }
    const fetched = await fetchAmazonCatalog(creds, token.accessToken, config);
    if (!fetched.ok && fetched.items.length === 0) {
      return {
        ok: false,
        itemsCount: 0,
        message: fetched.errors.join(" · ") || fetched.message,
      };
    }
    const imported = await importMarketplaceCatalog(siteId, platform, fetched.items);
    const errNote = fetched.errors.length ? ` · Uyarı: ${fetched.errors.slice(0, 2).join("; ")}` : "";
    return {
      ok: imported.ok,
      itemsCount: imported.matched,
      matched: imported.matched,
      unmatched: imported.unmatched,
      message: `${fetched.message} · ${imported.message}${errNote}`,
    };
  }

  if (xmlListingPlatforms().has(platform)) {
    return {
      ok: false,
      itemsCount: 0,
      message: `${platform}: katalog çekme API yok. Ürün gönder veya XML dışa aktar ile işaretlenir.`,
    };
  }

  return { ok: false, itemsCount: 0, message: `${platform} için katalog çekme desteklenmiyor` };
}

export async function pullAllMarketplaceCatalogs(siteId: string): Promise<{
  ok: boolean;
  message: string;
  results: (MarketplaceActionResult & { platform: string; matched?: number; unmatched?: number })[];
}> {
  const integrations = await prisma.marketplaceIntegration.findMany({
    where: { siteId, active: true },
    orderBy: { platform: "asc" },
  });

  const results: (MarketplaceActionResult & { platform: string; matched?: number; unmatched?: number })[] = [];
  for (const integration of integrations) {
    const config = parseConfig(integration.configJson);
    const result = await pullMarketplaceCatalog(siteId, integration.platform, config);
    await logMarketplaceAction(siteId, integration.platform, "pull_catalog", result);
    results.push({ ...result, platform: integration.platform });
  }

  const matchedTotal = results.reduce((sum, r) => sum + (r.matched ?? r.itemsCount), 0);
  const ok = results.some((r) => r.ok);
  return {
    ok,
    message:
      results.length === 0
        ? "Aktif pazaryeri entegrasyonu yok"
        : `${results.length} platform · ${matchedTotal} ürün eşleştirildi`,
    results,
  };
}

/** Web sitesini ana kaynak kabul edip tüm ürünleri her aktif pazaryerine yükler (oluştur + güncelle). */
export async function pushAllMarketplaceProducts(siteId: string): Promise<{
  ok: boolean;
  message: string;
  results: (MarketplaceActionResult & { platform: string })[];
}> {
  const integrations = await prisma.marketplaceIntegration.findMany({
    where: { siteId, active: true },
    orderBy: { platform: "asc" },
  });

  const results: (MarketplaceActionResult & { platform: string })[] = [];
  for (const integration of integrations) {
    const config = parseConfig(integration.configJson);
    const result = await pushMarketplaceProducts(siteId, integration.platform, config);
    await logMarketplaceAction(siteId, integration.platform, "sync", result);
    await prisma.marketplaceIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: result.ok ? new Date() : integration.lastSyncAt,
        lastError: result.ok ? null : result.message,
      },
    });
    results.push({ ...result, platform: integration.platform });
  }

  const sentTotal = results.reduce((sum, r) => sum + r.itemsCount, 0);
  const ok = results.some((r) => r.ok);
  return {
    ok,
    message:
      results.length === 0
        ? "Aktif pazaryeri entegrasyonu yok"
        : `${results.length} platform · ${sentTotal} ürün gönderildi`,
    results,
  };
}

export async function approveMarketplaceOrder(
  siteId: string,
  orderId: string,
): Promise<MarketplaceActionResult> {
  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
  });
  if (!order?.marketplacePlatform || !order.marketplaceMetaJson) {
    return { ok: false, itemsCount: 0, message: "Pazaryeri siparişi değil" };
  }

  const meta = parseMarketplaceOrderMeta(order.marketplaceMetaJson);
  if (!meta?.lines.length) {
    return { ok: false, itemsCount: 0, message: "Paket satır bilgisi eksik" };
  }

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId, platform: order.marketplacePlatform, active: true },
  });
  const config = parseConfig(integration?.configJson ?? null);

  if (order.marketplacePlatform === "trendyol") {
    const creds = parseTrendyolConfig(config);
    if (!creds) return { ok: false, itemsCount: 0, message: "Trendyol API eksik" };
    const result = await approveTrendyolPackage(creds, meta.shipmentPackageId, meta.lines);
    if (!result.ok) return { ok: false, itemsCount: 0, message: result.message };

    await prisma.storeOrder.update({
      where: { id: orderId },
      data: {
        status: "confirmed",
        marketplaceMetaJson: JSON.stringify({ ...meta, tyStatus: "Picking" }),
      },
    });

    const lines = await prisma.storeOrderLine.findMany({
      where: { orderId },
      select: { productId: true },
    });
    const productIds = lines.map((l) => l.productId).filter(Boolean) as string[];
    if (productIds.length) {
      await syncStockToAllMarketplaces(siteId, productIds);
    }

    return { ok: true, itemsCount: 1, message: result.message };
  }

  return { ok: false, itemsCount: 0, message: "Platform desteklenmiyor" };
}

export async function sendMarketplaceInvoice(
  siteId: string,
  orderId: string,
  input: { invoiceLink: string; invoiceNumber?: string },
): Promise<MarketplaceActionResult> {
  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
  });
  if (!order?.marketplacePlatform || !order.marketplaceMetaJson) {
    return { ok: false, itemsCount: 0, message: "Pazaryeri siparişi değil" };
  }

  const meta = parseMarketplaceOrderMeta(order.marketplaceMetaJson);
  if (!meta) return { ok: false, itemsCount: 0, message: "Meta veri okunamadı" };

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId, platform: order.marketplacePlatform, active: true },
  });
  const config = parseConfig(integration?.configJson ?? null);

  if (order.marketplacePlatform === "trendyol") {
    const creds = parseTrendyolConfig(config);
    if (!creds) return { ok: false, itemsCount: 0, message: "Trendyol API eksik" };

    const invoiceNumber = input.invoiceNumber?.trim() || `TY${meta.orderNumber}`.slice(0, 16);

    const pickResult = await approveTrendyolPackage(creds, meta.shipmentPackageId, meta.lines);
    if (!pickResult.ok) {
      return { ok: false, itemsCount: 0, message: pickResult.message };
    }

    const invResult = await invoiceTrendyolPackage(
      creds,
      meta.shipmentPackageId,
      meta.lines,
      invoiceNumber,
    );
    if (!invResult.ok) return { ok: false, itemsCount: 0, message: invResult.message };

    const linkResult = await sendTrendyolInvoiceLink(creds, {
      shipmentPackageId: meta.shipmentPackageId,
      invoiceLink: input.invoiceLink,
      invoiceNumber,
      invoiceDateTime: Math.floor(Date.now() / 1000),
    });

    await prisma.storeOrder.update({
      where: { id: orderId },
      data: {
        marketplaceMetaJson: JSON.stringify({
          ...meta,
          tyStatus: "Invoiced",
          invoiceNumber,
          invoiceLink: input.invoiceLink,
        }),
        adminNotes: [order.adminNotes, `Fatura: ${invoiceNumber}`].filter(Boolean).join(" · "),
      },
    });

    return {
      ok: linkResult.ok,
      itemsCount: 1,
      message: linkResult.ok
        ? `${invResult.message} · ${linkResult.message}`
        : linkResult.message,
    };
  }

  return { ok: false, itemsCount: 0, message: "Platform desteklenmiyor" };
}

export async function getIntegrationConfig(siteId: string, platform: string) {
  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId, platform },
  });
  return parseConfig(integration?.configJson ?? null);
}

export async function logMarketplaceAction(
  siteId: string,
  platform: string,
  action: string,
  result: MarketplaceActionResult,
) {
  await prisma.marketplaceSyncLog.create({
    data: {
      siteId,
      platform,
      action,
      status: result.ok ? "success" : "error",
      message: result.message,
      itemsCount: result.itemsCount,
    },
  });
}
