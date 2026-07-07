import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { syncProductsToTrendyol } from "@/lib/marketplace/trendyol";

type Body = { productIds?: string[] };

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as Body;
  const productIds = Array.isArray(body.productIds) ? body.productIds.filter(Boolean) : [];
  if (productIds.length === 0) {
    return NextResponse.json({ error: "Gönderilecek ürün seçin" }, { status: 400 });
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

  const products = await prisma.storeProduct.findMany({
    where: { siteId: auth.siteId, id: { in: productIds } },
    include: {
      brand: true,
      images: { orderBy: { sortOrder: "asc" }, take: 8 },
    },
  });

  const result = await syncProductsToTrendyol(products, config, auth.siteId);

  await prisma.marketplaceSyncLog.create({
    data: {
      siteId: auth.siteId,
      platform: "trendyol",
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
