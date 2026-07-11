import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseAmazonConfig } from "@/lib/marketplace/amazon/client";
import { reconcileAmazonListings } from "@/lib/marketplace/amazon/reconcile";
import { getIntegrationConfig, syncMarketplaceInventory } from "@/lib/marketplace/actions";

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
      select: { productId: true },
    });
    productIds = [...new Set(listings.map((l) => l.productId))];
  }

  if (productIds.length === 0) {
    return NextResponse.json(
      { error: "Teklif gönderilecek ürün seçin veya incompleteOnly kullanın" },
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
  const result = await syncMarketplaceInventory(auth.siteId, "amazon_tr", config, productIds);

  const creds = parseAmazonConfig(config);
  if (result.ok && creds) {
    await reconcileAmazonListings(auth.siteId, creds, config, { productIds });
  }

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
