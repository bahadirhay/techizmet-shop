import { NextResponse } from "next/server";
import {
  createHepsijetShipmentForOrder,
  fetchHepsijetLabelForOrder,
  refreshHepsijetShipmentForOrder,
} from "@/lib/shipping/hepsijet/order-shipment";
import { parseHepsijetOrderShipmentMeta } from "@/lib/shipping/hepsijet/types";
import { hepsijetReady, resolveHepsijetConfigFromCarrier } from "@/lib/shipping/hepsijet/settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const order = await prisma.storeOrder.findFirst({
    where: { id, siteId: auth.siteId },
    include: { carrier: true },
  });
  if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const carrier = order.carrier;
  const cfg = carrier ? resolveHepsijetConfigFromCarrier(carrier) : null;

  return NextResponse.json({
    ready: carrier ? hepsijetReady(carrier) : false,
    missing: cfg?.missing ?? ["Kargo firması seçilmemiş veya HepsiJet değil"],
    meta: parseHepsijetOrderShipmentMeta(order.shipmentMetaJson),
  });
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    const result = await createHepsijetShipmentForOrder(auth.siteId, id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "HepsiJet gönderi hatası";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    const result = await refreshHepsijetShipmentForOrder(auth.siteId, id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "HepsiJet yenileme hatası";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    const result = await fetchHepsijetLabelForOrder(auth.siteId, id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Etiket alınamadı";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
