import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import {
  searchTrendyolBrands,
  searchTrendyolCategories,
} from "@/lib/marketplace/trendyol/categories";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const params = new URL(req.url).searchParams;
  const type = params.get("type")?.trim() ?? "";
  const q = params.get("q")?.trim() ?? "";
  if (type !== "category" && type !== "brand") {
    return NextResponse.json({ error: "type 'category' veya 'brand' olmalı" }, { status: 400 });
  }
  if (type === "brand" && !q) {
    return NextResponse.json({ error: "Marka adı gerekli" }, { status: 400 });
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

  if (type === "brand") {
    const result = await searchTrendyolBrands(creds, q);
    if (!result.ok) {
      return NextResponse.json({ error: `Marka aranamadı: ${result.message}` }, { status: 502 });
    }
    return NextResponse.json({ brands: result.brands });
  }

  const result = await searchTrendyolCategories(creds, q);
  if (!result.ok) {
    return NextResponse.json({ error: `Kategori aranamadı: ${result.message}` }, { status: 502 });
  }
  return NextResponse.json({ categories: result.categories });
}
