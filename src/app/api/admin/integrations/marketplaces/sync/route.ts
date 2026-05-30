import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { runMarketplaceSync } from "@/lib/marketplace/sync";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as { platform?: string };
  const platform = String(body.platform ?? "").trim().toLowerCase();
  if (!platform) return NextResponse.json({ error: "Platform gerekli" }, { status: 400 });

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId: auth.siteId, platform },
  });
  if (!integration) {
    return NextResponse.json({ error: "Entegrasyon bulunamadı" }, { status: 404 });
  }

  let config: Record<string, string> = {};
  try {
    config = JSON.parse(integration.configJson ?? "{}") as Record<string, string>;
  } catch {
    config = {};
  }

  const result = await runMarketplaceSync(auth.siteId, platform, config);

  await prisma.marketplaceIntegration.update({
    where: { id: integration.id },
    data: {
      lastSyncAt: result.ok ? new Date() : integration.lastSyncAt,
      lastError: result.ok ? null : result.message,
    },
  });

  await prisma.marketplaceSyncLog.create({
    data: {
      siteId: auth.siteId,
      platform,
      action: "sync",
      status: result.ok ? "success" : "error",
      message: result.message,
      itemsCount: result.itemsCount,
    },
  });

  return NextResponse.json({ result });
}
