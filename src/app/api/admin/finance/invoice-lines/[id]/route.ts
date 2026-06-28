import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const body = (await req.json()) as {
    description?: string;
    unit?: string;
    unitPriceTl?: number;
    vatRate?: number;
    notes?: string;
    sortOrder?: number;
  };

  const existing = await prisma.financeInvoiceLineTemplate.findFirst({
    where: { id, siteId: auth.siteId },
  });
  if (!existing) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

  const template = await prisma.financeInvoiceLineTemplate.update({
    where: { id },
    data: {
      ...(body.description?.trim() ? { description: body.description.trim() } : {}),
      ...(body.unit?.trim() ? { unit: body.unit.trim() } : {}),
      ...(typeof body.unitPriceTl === "number" ? { unitPriceTl: body.unitPriceTl } : {}),
      ...(typeof body.vatRate === "number" ? { vatRate: body.vatRate } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
    },
  });

  return NextResponse.json({ template });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await prisma.financeInvoiceLineTemplate.findFirst({
    where: { id, siteId: auth.siteId },
  });
  if (!existing) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

  // Soft delete
  await prisma.financeInvoiceLineTemplate.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}
