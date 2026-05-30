import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.shipping");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const carrier = await prisma.shippingCarrier.findFirst({
    where: { id, siteId: auth.siteId },
    include: { rates: { orderBy: { sortOrder: "asc" } } },
  });
  if (!carrier) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ carrier });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.shipping");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.shippingCarrier.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const config =
    body.config !== undefined
      ? body.config && typeof body.config === "object"
        ? JSON.stringify(body.config)
        : null
      : undefined;

  const carrier = await prisma.shippingCarrier.update({
    where: { id },
    data: {
      code: body.code != null ? String(body.code).trim().toLowerCase() : undefined,
      name: body.name != null ? String(body.name).trim() : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
      trackingUrlTemplate:
        body.trackingUrlTemplate !== undefined
          ? String(body.trackingUrlTemplate).trim() || null
          : undefined,
      customerServicePhone:
        body.customerServicePhone !== undefined
          ? String(body.customerServicePhone).trim() || null
          : undefined,
      notes: body.notes !== undefined ? String(body.notes).trim() || null : undefined,
      configJson: config,
      sortOrder: body.sortOrder != null ? parseInt(String(body.sortOrder), 10) : undefined,
    },
  });
  return NextResponse.json({ carrier });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.shipping");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.shippingCarrier.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  await prisma.shippingCarrier.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
