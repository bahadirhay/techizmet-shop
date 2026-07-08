import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GEÇİCİ tek seferlik seed endpoint'i.
 * MP_SEED_TOKEN env değişkeni ile korunur; config isteğin gövdesinde (HTTPS) gelir.
 * Amazon (veya başka) pazaryeri entegrasyonunu DB'ye yazar. Kullanım sonrası kaldırılır.
 */
export async function POST(req: Request) {
  const token = process.env.MP_SEED_TOKEN?.trim();
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token || provided !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { platform?: string; label?: string; config?: Record<string, string> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const platform = String(body.platform ?? "").trim();
  const config = body.config;
  if (!platform || !config || typeof config !== "object") {
    return NextResponse.json({ error: "platform ve config zorunlu" }, { status: 400 });
  }

  const existing = await prisma.marketplaceIntegration.findFirst({ orderBy: { createdAt: "asc" } });
  let siteId = existing?.siteId;
  if (!siteId) {
    const site = await prisma.storeSite.findFirst();
    siteId = site?.id;
  }
  if (!siteId) {
    return NextResponse.json({ error: "Site bulunamadı" }, { status: 400 });
  }

  const res = await prisma.marketplaceIntegration.upsert({
    where: { siteId_platform: { siteId, platform } },
    create: {
      siteId,
      platform,
      label: body.label?.trim() || platform,
      active: true,
      configJson: JSON.stringify(config),
      lastError: null,
    },
    update: { active: true, configJson: JSON.stringify(config), lastError: null },
  });

  return NextResponse.json({ ok: true, id: res.id, siteId, platform, active: res.active });
}
