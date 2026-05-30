import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.customers");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const group = await prisma.customerGroup.findFirst({
    where: { id, siteId: auth.siteId },
    include: { _count: { select: { members: true } } },
  });
  if (!group) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ group });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.customers");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.customerGroup.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const group = await prisma.customerGroup.update({
    where: { id },
    data: {
      name: body.name != null ? String(body.name).trim() : undefined,
      slug: body.slug != null ? String(body.slug).trim() : undefined,
      discountPercent:
        body.discountPercent != null
          ? Math.min(99, Math.max(0, parseInt(String(body.discountPercent), 10) || 0))
          : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
      description: body.description !== undefined ? String(body.description).trim() || null : undefined,
      orderNumberPrefix:
        body.orderNumberPrefix !== undefined
          ? String(body.orderNumberPrefix).trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || null
          : undefined,
    },
  });
  return NextResponse.json({ group });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.customers");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  await prisma.customerGroup.deleteMany({ where: { id, siteId: auth.siteId } });
  return NextResponse.json({ ok: true });
}
