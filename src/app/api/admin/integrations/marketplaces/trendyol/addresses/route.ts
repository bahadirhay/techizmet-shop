import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import { fetchTrendyolAddresses } from "@/lib/marketplace/trendyol/categories";

export async function GET() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const integration = await prisma.marketplaceIntegration.findUnique({
    where: { siteId_platform: { siteId: auth.siteId, platform: "trendyol" } },
  });
  let config: Record<string, string> = {};
  try {
    config = JSON.parse(integration?.configJson ?? "{}") as Record<string, string>;
  } catch {
    config = {};
  }

  const creds = parseTrendyolConfig(config);
  if (!creds) {
    return NextResponse.json(
      { error: "Trendyol API bilgileri eksik (Satıcı ID, API Key, API Secret)." },
      { status: 400 },
    );
  }

  const result = await fetchTrendyolAddresses(creds);
  if (!result.ok) {
    return NextResponse.json({ error: `Adresler alınamadı: ${result.message}` }, { status: 502 });
  }

  return NextResponse.json({ addresses: result.addresses });
}
