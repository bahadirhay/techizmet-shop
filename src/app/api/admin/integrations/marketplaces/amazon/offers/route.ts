import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import {
  getAmazonAccessToken,
  parseAmazonConfig,
  resolveAmazonMarketplaceId,
} from "@/lib/marketplace/amazon/client";
import { reconcileAmazonListings } from "@/lib/marketplace/amazon/reconcile";
import { upsertProductMarketplaceListing } from "@/lib/marketplace/catalog-import";
import { getIntegrationConfig } from "@/lib/marketplace/actions";
import { syncAmazonOffersWithRetry, pushAmazonOfferForAsin } from "@/lib/marketplace/amazon/inventory";
import { resolveAmazonSkuForSync, resolveKnownAmazonAsin } from "@/lib/marketplace/amazon/sku";
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

  const marketplaceId = resolveAmazonMarketplaceId(config);

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
    select: { productId: true, metaJson: true, barcode: true, listingStatus: true },
  });
  const listingByProduct = new Map(listings.map((l) => [l.productId, l]));

  const items: {
    sku: string;
    quantity: number;
    salePriceMinor: number;
    listPriceMinor: number;
    productId: string;
  }[] = [];
  let directOffers = 0;

  for (const p of products) {
    const listing = listingByProduct.get(p.id);
    const prices = toMarketplaceSyncPrices(p, "amazon_tr");
    const sku = await resolveAmazonSkuForSync(
      creds,
      token.accessToken,
      marketplaceId,
      listing?.metaJson ?? null,
      p,
      listing?.barcode ?? null,
    );
    const asin = resolveKnownAmazonAsin({
      metaJson: listing?.metaJson,
      listingBarcode: listing?.barcode,
      productBarcode: p.barcode,
    });
    const offerItem = {
      sku,
      quantity: p.stockQty,
      salePriceMinor: prices.salePriceMinor,
      listPriceMinor: prices.listPriceMinor,
    };

    if (asin) {
      const direct = await pushAmazonOfferForAsin(
        creds,
        token.accessToken,
        marketplaceId,
        sku,
        asin,
        offerItem,
        config,
      );
      if (direct.ok) {
        directOffers++;
        await upsertProductMarketplaceListing(auth.siteId, p.id, "amazon_tr", {
          listingStatus: listing?.listingStatus ?? "pending",
          metaPatch: { sku, asin },
        });
        continue;
      }
    }

    items.push({ ...offerItem, productId: p.id });
  }

  const asinBySku = new Map<string, string>();
  for (const p of products) {
    const listing = listingByProduct.get(p.id);
    const asin = resolveKnownAmazonAsin({
      metaJson: listing?.metaJson,
      listingBarcode: listing?.barcode,
      productBarcode: p.barcode,
    });
    if (!asin) continue;
    const item = items.find((i) => i.productId === p.id);
    if (item) asinBySku.set(item.sku, asin);
  }

  const offerResult =
    items.length > 0
      ? await syncAmazonOffersWithRetry(
          creds,
          token.accessToken,
          marketplaceId,
          items.map(({ productId: _pid, ...item }) => item),
          config,
          { rounds: 6, delayMs: 12000, offerOnlyFirst: true, asinBySku },
        )
      : { ok: directOffers > 0, sent: 0, message: "", errors: [] as string[] };

  for (const item of items) {
    const listing = listingByProduct.get(item.productId);
    if (!listing) continue;
    const asin = resolveKnownAmazonAsin({
      metaJson: listing.metaJson,
      listingBarcode: listing.barcode,
    });
    await upsertProductMarketplaceListing(auth.siteId, item.productId, "amazon_tr", {
      listingStatus: listing.listingStatus,
      metaPatch: { sku: item.sku, ...(asin ? { asin } : {}) },
    });
  }

  await reconcileAmazonListings(auth.siteId, creds, config, { productIds, pushPendingOffers: false });

  const totalSent = directOffers + offerResult.sent;
  const result = {
    ok: totalSent > 0,
    itemsCount: totalSent,
    message:
      totalSent > 0
        ? `${totalSent} ürün için teklif/stok gönderildi${offerResult.message ? ` · ${offerResult.message}` : ""}`
        : offerResult.message || "Teklif gönderilemedi",
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
