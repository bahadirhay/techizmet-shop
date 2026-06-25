import { NextResponse } from "next/server";
import { parseCarrierConfig } from "@/lib/shipping/carrier-config";
import { hepsijetTestConnection } from "@/lib/shipping/hepsijet/client";
import { resolveHepsijetConfigFromCarrier } from "@/lib/shipping/hepsijet/settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.shipping");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const carrier = await prisma.shippingCarrier.findFirst({ where: { id, siteId: auth.siteId } });
  if (!carrier) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const cfg = resolveHepsijetConfigFromCarrier(carrier);
  if (!cfg) {
    return NextResponse.json({ error: "Bu firma HepsiJet API ile yapılandırılmamış" }, { status: 400 });
  }
  if (!cfg.configured) {
    return NextResponse.json({ error: `Eksik alanlar: ${cfg.missing.join(", ")}` }, { status: 400 });
  }

  try {
    const result = await hepsijetTestConnection(cfg);
    return NextResponse.json({
      ok: true,
      message: `HepsiJet bağlantısı başarılı${result.testMode ? " (test ortamı)" : ""}`,
      testMode: result.testMode,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bağlantı hatası";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.shipping");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const carrier = await prisma.shippingCarrier.findFirst({ where: { id, siteId: auth.siteId } });
  if (!carrier) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  const cfg = parseCarrierConfig(carrier.configJson);
  const hepsijet = resolveHepsijetConfigFromCarrier(carrier);
  return NextResponse.json({
    provider: cfg.provider,
    hepsijetReady: Boolean(hepsijet?.configured),
    missing: hepsijet?.missing ?? [],
  });
}
