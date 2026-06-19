import { NextResponse } from "next/server";
import { createGeliverClient } from "@/lib/shipping/geliver/client";
import { ensureGeliverCheckoutRate } from "@/lib/shipping/geliver/ensure-checkout-rate";
import { syncGeliverCheckoutQuotes } from "@/lib/shipping/geliver/checkout-quotes";
import { ensureGeliverSenderAddress } from "@/lib/shipping/geliver/address";
import { geliverReady, resolveGeliverConfig } from "@/lib/shipping/geliver/settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { getPublicSiteUrl } from "@/lib/seo/site-url";

export const maxDuration = 60;

export async function POST() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const config = resolveGeliverConfig(settings, getPublicSiteUrl());

  if (!config.apiToken) {
    return NextResponse.json({ ok: false, error: "API token girilmedi" }, { status: 400 });
  }

  try {
    const client = createGeliverClient(config);
    const cities = await client.geo.listCities("TR");
    const cityCount = Array.isArray(cities) ? cities.length : 0;
    await syncGeliverCheckoutQuotes(auth.siteId, 1, { shipmentFallback: true }).catch(() =>
      ensureGeliverCheckoutRate(auth.siteId),
    );
    return NextResponse.json({
      ok: true,
      message: `Bağlantı başarılı (${cityCount} şehir listelendi)`,
      testMode: config.testMode,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Geliver bağlantı hatası";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PUT() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const config = resolveGeliverConfig(settings, getPublicSiteUrl());
  if (!config.apiToken) {
    return NextResponse.json({ ok: false, error: "API token gerekli" }, { status: 400 });
  }

  try {
    const client = createGeliverClient(config);
    const senderId = await ensureGeliverSenderAddress(client, settings, config);
    return NextResponse.json({ ok: true, senderAddressId: senderId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gönderici adresi oluşturulamadı";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
