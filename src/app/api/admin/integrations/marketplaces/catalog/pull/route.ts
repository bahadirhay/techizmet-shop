import { NextResponse } from "next/server";
import {
  getIntegrationConfig,
  logMarketplaceAction,
  pullAllMarketplaceCatalogs,
  pullMarketplaceCatalog,
} from "@/lib/marketplace/actions";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { platform?: string; all?: boolean };
  const platform = String(body.platform ?? "").trim().toLowerCase();

  if (body.all || !platform) {
    const batch = await pullAllMarketplaceCatalogs(auth.siteId);
    return NextResponse.json({ result: batch });
  }

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId: auth.siteId, platform, active: true },
  });
  if (!integration) {
    return NextResponse.json({ error: "Aktif entegrasyon bulunamadı" }, { status: 404 });
  }

  const config = await getIntegrationConfig(auth.siteId, platform);
  const result = await pullMarketplaceCatalog(auth.siteId, platform, config);
  await logMarketplaceAction(auth.siteId, platform, "pull_catalog", result);

  return NextResponse.json({ result });
}
