import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.customers");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const customer = await prisma.storeCustomer.findFirst({
    where: { id, siteId: auth.siteId },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalMinor: true,
          paymentMethod: true,
          createdAt: true,
        },
      },
      _count: { select: { favorites: true } },
    },
  });
  if (!customer) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  return NextResponse.json({ customer });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.customers");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeCustomer.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as { notes?: string; customerGroupId?: string | null };
  const customer = await prisma.storeCustomer.update({
    where: { id },
    data: {
      notes: body.notes !== undefined ? String(body.notes).trim() || null : undefined,
      customerGroupId:
        body.customerGroupId !== undefined
          ? body.customerGroupId
            ? String(body.customerGroupId).trim() || null
            : null
          : undefined,
    },
    include: { customerGroup: true },
  });
  return NextResponse.json({ customer });
}
