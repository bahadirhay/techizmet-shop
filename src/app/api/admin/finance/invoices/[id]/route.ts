import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const entry = await prisma.invoiceEntry.findUnique({ where: { id } });
  if (!entry || entry.siteId !== auth.siteId) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  await prisma.invoiceEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const entry = await prisma.invoiceEntry.findUnique({ where: { id } });
  if (!entry || entry.siteId !== auth.siteId) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  const body = await req.json();
  const updated = await prisma.invoiceEntry.update({
    where: { id },
    data: {
      ...(body.netMinor !== undefined && { netMinor: Math.round(parseFloat(String(body.netMinor))) }),
      ...(body.kdvRate !== undefined && { kdvRate: parseInt(String(body.kdvRate), 10) }),
      ...(body.kdvMinor !== undefined && { kdvMinor: Math.round(parseFloat(String(body.kdvMinor))) }),
      ...(body.invoiceNo !== undefined && { invoiceNo: body.invoiceNo?.trim() || null }),
      ...(body.counterparty !== undefined && { counterparty: body.counterparty?.trim() || null }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
      ...(body.direction !== undefined && { direction: body.direction }),
      ...(body.invoiceDate !== undefined && { invoiceDate: new Date(body.invoiceDate) }),
    },
  });
  return NextResponse.json({ entry: { ...updated, invoiceDate: updated.invoiceDate.toISOString(), createdAt: updated.createdAt.toISOString() } });
}
