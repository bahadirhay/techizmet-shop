import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import {
  getAmazonAccessToken,
  parseAmazonConfig,
  resolveAmazonMarketplaceId,
} from "@/lib/marketplace/amazon/client";
import { reconcileAmazonListings } from "@/lib/marketplace/amazon/reconcile";
import { getIntegrationConfig } from "@/lib/marketplace/actions";
import { syncAmazonOffersWithRetry } from "@/lib/marketplace/amazon/inventory";
import { resolveAmazonListingSku } from "@/lib/marketplace/amazon/sku";
import { toMarketplaceSyncPrices } from "@/lib/marketplace/product-prices";

type Body = { productIds?: string[]; incompleteOnly?: boolean };

export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as Body;
  let productIds = Array.isArray(body.productIds) ? body.productIds.filter(Boolean) : [];

  if (body.incompleteOnly && productIds.length === 0) {
    const listings = await prisma.marketplaceProductListing.findMany({
      where: {
        siteId: auth.siteId,
        platform: "amazon_tr",
        listingStatus: { in: ["pending", "inactive", "exported", "error"] },
      },
      select: { productId: true, metaJson: true },
    });
    productIds = [
      ...new Set(
        listings
          .filter((l) => {
            try {
              const meta = JSON.parse(l.metaJson ?? "{}") as { asin?: string };
              return Boolean(meta.asin?.trim());
            } catch {
              return false;
            }
          })
          .map((l) => l.productId),
      ),
    ];
  }

  if (productIds.length === 0) {
    return NextResponse.json(
      { error: "Teklif gönderilecek ürün seçin (ASIN'i olan ilanlar)" },
      { status: 400 },
    );
  }

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId: auth.siteId, platform: "amazon_tr" },
  });
  if (!integration) {
    return NextResponse.json({ error: "Amazon entegrasyonu bulunamadı" }, { status: 404 });
  }

  const config = await getIntegrationConfig(auth.siteId, "amazon_tr");
  const creds = parseAmazonConfig(config);
  if (!creds) {
    return NextResponse.json({ error: "Amazon SP-API bilgileri eksik" }, { status: 400 });
  }
  const token = await getAmazonAccessToken(creds);
  if (!token.accessToken) {
    return NextResponse.json({ error: token.error ?? "Amazon token alınamadı" }, { status: 502 });
  }

  const products = await prisma.storeProduct.findMany({
    where: { siteId: auth.siteId, id: { in: productIds } },
    select: {
      id: true,
      sku: true,
      slug: true,
      barcode: true,
      stockQty: true,
      priceMinor: true,
      compareAtMinor: true,
      marketplacePricesJson: true,
      marketplaceMarkupPercentJson: true,
    },
  });
  const listings = await prisma.marketplaceProductListing.findMany({
    where: { siteId: auth.siteId, platform: "amazon_tr", productId: { in: productIds } },
    select: { productId: true, metaJson: true },
  });
  const listingByProduct = new Map(listings.map((l) => [l.productId, l.metaJson]));
  const items = products.map((p) => {
    const prices = toMarketplaceSyncPrices(p, "amazon_tr");
    return {
      sku: resolveAmazonListingSku(listingByProduct.get(p.id) ?? null, p),
      quantity: p.stockQty,
      salePriceMinor: prices.salePriceMinor,
      listPriceMinor: prices.listPriceMinor,
    };
  });

  const marketplaceId = resolveAmazonMarketplaceId(config);
  const offerResult = await syncAmazonOffersWithRetry(
    creds,
    token.accessToken,
    marketplaceId,
    items,
    config,
  );

  await reconcileAmazonListings(auth.siteId, creds, config, { productIds, pushPendingOffers: false });

  const result = {
    ok: offerResult.ok,
    itemsCount: offerResult.sent,
    message: offerResult.message,
  };

  await prisma.marketplaceSyncLog.create({
    data: {
      siteId: auth.siteId,
      platform: "amazon_tr",
      action: "offer_sync",
      status: result.ok ? "success" : "error",
      message: result.message,
      itemsCount: result.itemsCount,
    },
  });

  return NextResponse.json({ result });
}
