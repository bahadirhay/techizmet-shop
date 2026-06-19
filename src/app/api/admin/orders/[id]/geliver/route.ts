import { NextResponse } from "next/server";
import {
  acceptGeliverOfferForOrder,
  createGeliverShipmentForOrder,
  refreshGeliverShipmentForOrder,
} from "@/lib/shipping/geliver/order-shipment";
import { parseGeliverOrderShipmentMeta } from "@/lib/shipping/geliver/types";
import { geliverReady, geliverShipmentReady, resolveGeliverConfig } from "@/lib/shipping/geliver/settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { getPublicSiteUrl } from "@/lib/seo/site-url";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const order = await prisma.storeOrder.findFirst({ where: { id, siteId: auth.siteId } });
  if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const config = resolveGeliverConfig(settings, getPublicSiteUrl());

  return NextResponse.json({
    ready: geliverReady(settings, getPublicSiteUrl()),
    shipmentReady: geliverShipmentReady(settings, getPublicSiteUrl()),
    missing: config.missing,
    meta: parseGeliverOrderShipmentMeta(order.shipmentMetaJson),
  });
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    const result = await createGeliverShipmentForOrder(auth.siteId, id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Geliver gönderi hatası";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    const result = await refreshGeliverShipmentForOrder(auth.siteId, id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Geliver yenileme hatası";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { offerId?: string };

  try {
    const result = await acceptGeliverOfferForOrder(auth.siteId, id, body.offerId);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Teklif kabul hatası";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
