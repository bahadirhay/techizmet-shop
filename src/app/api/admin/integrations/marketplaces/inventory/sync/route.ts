import { NextResponse } from "next/server";
import {
  getIntegrationConfig,
  logMarketplaceAction,
  syncMarketplaceInventory,
} from "@/lib/marketplace/actions";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { platform?: string };
  const platform = String(body.platform ?? "").trim().toLowerCase();
  if (!platform) return NextResponse.json({ error: "Platform gerekli" }, { status: 400 });

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId: auth.siteId, platform, active: true },
  });
  if (!integration) {
    return NextResponse.json({ error: "Aktif entegrasyon bulunamadı" }, { status: 404 });
  }

  const config = await getIntegrationConfig(auth.siteId, platform);
  const result = await syncMarketplaceInventory(auth.siteId, platform, config);

  await prisma.marketplaceIntegration.update({
    where: { id: integration.id },
    data: {
      lastSyncAt: result.ok ? new Date() : integration.lastSyncAt,
      lastError: result.ok ? null : result.message,
    },
  });

  await logMarketplaceAction(auth.siteId, platform, "inventory_sync", result);

  return NextResponse.json({ result });
}
