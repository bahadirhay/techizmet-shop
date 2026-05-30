import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/account/require-customer";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireCustomerApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.customerAddress.findFirst({
    where: { id, customerId: auth.customer.id },
  });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const isDefault = body.isDefault !== undefined ? Boolean(body.isDefault) : undefined;

  if (isDefault) {
    await prisma.customerAddress.updateMany({
      where: { customerId: auth.customer.id },
      data: { isDefault: false },
    });
  }

  const address = await prisma.customerAddress.update({
    where: { id },
    data: {
      label: body.label !== undefined ? String(body.label ?? "").trim() || null : undefined,
      firstName: body.firstName !== undefined ? String(body.firstName ?? "").trim() || null : undefined,
      lastName: body.lastName !== undefined ? String(body.lastName ?? "").trim() || null : undefined,
      phone: body.phone !== undefined ? String(body.phone ?? "").trim() || null : undefined,
      city: body.city !== undefined ? String(body.city).trim() : undefined,
      district: body.district !== undefined ? String(body.district).trim() : undefined,
      line1: body.line1 !== undefined ? String(body.line1).trim() : undefined,
      postalCode:
        body.postalCode !== undefined ? String(body.postalCode ?? "").trim() || null : undefined,
      isDefault,
    },
  });
  return NextResponse.json({ address });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireCustomerApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.customerAddress.findFirst({
    where: { id, customerId: auth.customer.id },
  });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  await prisma.customerAddress.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
