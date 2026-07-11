import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseAmazonConfig } from "@/lib/marketplace/amazon/client";
import { reconcileAmazonListings } from "@/lib/marketplace/amazon/reconcile";
import { marketplaceProductListingDb } from "@/lib/marketplace/prisma-marketplace";

export const maxDuration = 120;

/** Amazon SKU üzerinden gönderilmiş ilanların durumunu doğrular. */
export async function POST() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  if (!marketplaceProductListingDb()) {
    return NextResponse.json({ error: "Pazaryeri tabloları hazır değil (deploy sonrası)." }, { status: 400 });
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

  const creds = parseAmazonConfig(config);
  if (!creds) {
    return NextResponse.json({ error: "Amazon SP-API bilgileri eksik" }, { status: 400 });
  }

  const result = await reconcileAmazonListings(auth.siteId, creds, config, { pushPendingOffers: true });
  return NextResponse.json(result);
}
