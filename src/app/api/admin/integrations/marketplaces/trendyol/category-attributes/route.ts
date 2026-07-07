import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import { fetchTrendyolCategoryAttributes } from "@/lib/marketplace/trendyol/categories";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const categoryId = Number(new URL(req.url).searchParams.get("categoryId")?.trim() ?? "");
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return NextResponse.json({ error: "Geçerli Trendyol kategori ID gerekli" }, { status: 400 });
  }

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

  const result = await fetchTrendyolCategoryAttributes(creds, categoryId);
  if (!result.ok) {
    return NextResponse.json({ error: `Özellikler alınamadı: ${result.message}` }, { status: 502 });
  }

  return NextResponse.json({ attributes: result.attributes });
}
