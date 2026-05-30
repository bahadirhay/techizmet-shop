import { NextResponse } from "next/server";
import { sendOrderStatusEmailIfNeeded } from "@/lib/email/send-order-email";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const order = await prisma.storeOrder.findFirst({
    where: { id, siteId: auth.siteId },
    include: { lines: true, carrier: true, customer: true },
  });
  if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeOrder.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const newStatus = body.status != null ? String(body.status) : existing.status;
  const order = await prisma.storeOrder.update({
    where: { id },
    data: {
      status: body.status != null ? newStatus : undefined,
      carrierId: body.carrierId !== undefined ? String(body.carrierId ?? "").trim() || null : undefined,
      trackingNumber:
        body.trackingNumber !== undefined ? String(body.trackingNumber).trim() || null : undefined,
      paymentStatus: body.paymentStatus != null ? String(body.paymentStatus) : undefined,
      adminNotes: body.adminNotes !== undefined ? String(body.adminNotes).trim() || null : undefined,
    },
    include: { lines: true, carrier: true },
  });

  if (body.status != null && newStatus !== existing.status) {
    await sendOrderStatusEmailIfNeeded(order.id, existing.status, newStatus).catch((e) =>
      console.error("[email] status", e),
    );
  }

  return NextResponse.json({ order });
}
