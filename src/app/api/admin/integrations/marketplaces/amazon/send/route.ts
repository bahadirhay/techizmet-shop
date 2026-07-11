import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseAmazonConfig } from "@/lib/marketplace/amazon/client";
import { syncProductsToAmazon } from "@/lib/marketplace/amazon/products";
import { reconcileAmazonListings } from "@/lib/marketplace/amazon/reconcile";

type Body = { productIds?: string[]; resendIncomplete?: boolean };

export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as Body;
  let productIds = Array.isArray(body.productIds) ? body.productIds.filter(Boolean) : [];

  if (body.resendIncomplete) {
    const listings = await prisma.marketplaceProductListing.findMany({
      where: {
        siteId: auth.siteId,
        platform: "amazon_tr",
        listingStatus: { in: ["pending", "rejected", "exported", "error"] },
      },
      select: { productId: true },
    });
    productIds = [...new Set(listings.map((l) => l.productId))];
    if (productIds.length === 0) {
      const anyListing = await prisma.marketplaceProductListing.findMany({
        where: { siteId: auth.siteId, platform: "amazon_tr" },
        select: { productId: true },
      });
      productIds = [...new Set(anyListing.map((l) => l.productId))];
    }
  }

  if (productIds.length === 0) {
    return NextResponse.json(
      {
        error: body.resendIncomplete
          ? "Güncellenecek Amazon ilanı bulunamadı"
          : "Gönderilecek ürün seçin",
      },
      { status: 400 },
    );
  }

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId: auth.siteId, platform: "amazon_tr" },
  });
  if (!integration) {
    return NextResponse.json({ error: "Amazon entegrasyonu bulunamadı" }, { status: 404 });
  }
  let config: Record<string, string> = {};
  try {
    config = JSON.parse(integration.configJson ?? "{}") as Record<string, string>;
  } catch {
    config = {};
  }

  const products = await prisma.storeProduct.findMany({
    where: { siteId: auth.siteId, id: { in: productIds } },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" }, take: 8 },
    },
  });

  const result = await syncProductsToAmazon(products, config, auth.siteId);

  const creds = parseAmazonConfig(config);
  if (result.sent > 0 && creds) {
    await reconcileAmazonListings(auth.siteId, creds, config, { productIds });
  }

  await prisma.marketplaceSyncLog.create({
    data: {
      siteId: auth.siteId,
      platform: "amazon_tr",
      action: "sync_selected",
      status: result.ok ? "success" : "error",
      message: result.message,
      itemsCount: result.sent,
    },
  });

  await prisma.marketplaceIntegration.update({
    where: { id: integration.id },
    data: {
      lastSyncAt: result.ok ? new Date() : integration.lastSyncAt,
      lastError: result.ok ? null : result.message,
    },
  });

  return NextResponse.json({ result });
}
