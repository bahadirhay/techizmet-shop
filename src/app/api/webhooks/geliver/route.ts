import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@geliver/sdk";
import { handleGeliverWebhookForSite } from "@/lib/shipping/geliver/order-shipment";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";

export async function POST(req: Request) {
  const raw = await req.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const site = await getDefaultSite();
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 500 });

  const row = await prisma.storeSite.findUnique({ where: { id: site.id } });
  const settings = parseSiteSettings(row?.settingsJson ?? null);
  const secret = settings.geliver?.webhookSecret?.trim();

  if (secret) {
    const ok = verifyWebhookSignature(raw, Object.fromEntries(req.headers.entries()), {
      secret,
      enableVerification: true,
    });
    if (!ok) return NextResponse.json({ error: "İmza geçersiz" }, { status: 401 });
  }

  const result = await handleGeliverWebhookForSite(site.id, payload as Parameters<typeof handleGeliverWebhookForSite>[1]);
  return NextResponse.json(result);
}
