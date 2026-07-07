import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import { reconcileTrendyolListings } from "@/lib/marketplace/trendyol/reconcile";
import { marketplaceProductListingDb } from "@/lib/marketplace/prisma-marketplace";

export const maxDuration = 120;

/** Trendyol batch + barkod sorgusu ile gerçek ürün durumunu doğrular ve günceller. */
export async function POST() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  if (!marketplaceProductListingDb()) {
    return NextResponse.json({ error: "Pazaryeri tabloları hazır değil (deploy sonrası)." }, { status: 400 });
  }

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId: auth.siteId, platform: "trendyol" },
  });
  if (!integration) {
    return NextResponse.json({ error: "Trendyol entegrasyonu bulunamadı" }, { status: 404 });
  }
  let config: Record<string, string> = {};
  try {
    config = JSON.parse(integration.configJson ?? "{}") as Record<string, string>;
  } catch {
    config = {};
  }
  const creds = parseTrendyolConfig(config);
  if (!creds) {
    return NextResponse.json({ error: "Trendyol API bilgileri eksik" }, { status: 400 });
  }

  const result = await reconcileTrendyolListings(auth.siteId, creds);

  return NextResponse.json({
    ok: result.ok,
    message: result.message,
    details: result.details,
    foundOnTrendyol: result.foundOnTrendyol,
    active: result.active,
    pending: result.pending,
    rejected: result.rejected,
    notFound: result.notFound,
    batchFailed: result.batchFailed,
  });
}
