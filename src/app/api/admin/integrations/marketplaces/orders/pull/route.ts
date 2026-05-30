import { NextResponse } from "next/server";
import {
  getIntegrationConfig,
  logMarketplaceAction,
  pullMarketplaceOrders,
} from "@/lib/marketplace/actions";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { platform?: string; status?: string };
  const platform = String(body.platform ?? "").trim().toLowerCase();
  if (!platform) return NextResponse.json({ error: "Platform gerekli" }, { status: 400 });

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId: auth.siteId, platform, active: true },
  });
  if (!integration) {
    return NextResponse.json({ error: "Aktif entegrasyon bulunamadı" }, { status: 404 });
  }

  const config = await getIntegrationConfig(auth.siteId, platform);
  const result = await pullMarketplaceOrders(
    auth.siteId,
    platform,
    config,
    body.status ?? "Created",
  );

  await logMarketplaceAction(auth.siteId, platform, "pull_orders", result);

  return NextResponse.json({ result });
}
