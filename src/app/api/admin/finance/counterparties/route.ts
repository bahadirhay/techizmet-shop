import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const counterparties = await prisma.financeCounterparty.findMany({
    where: { siteId: auth.siteId, active: true },
    orderBy: [{ type: "asc" }, { title: "asc" }],
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    take: 400,
  });
  return NextResponse.json({ counterparties });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as {
    type?: string;
    customerId?: string;
    title?: string;
    email?: string;
    phone?: string;
    taxId?: string;
    taxOffice?: string;
    addressLine?: string;
    city?: string;
    district?: string;
    notes?: string;
  };
  const type = body.type === "site_member" ? "site_member" : "external_manual";
  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Ünvan zorunlu." }, { status: 400 });

  if (body.taxId?.trim()) {
    const exists = await prisma.financeCounterparty.findFirst({
      where: { siteId: auth.siteId, taxId: body.taxId.trim() },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json({ error: "Bu vergi kimliği ile kayıt var." }, { status: 400 });
    }
  }

  const row = await prisma.financeCounterparty.create({
    data: {
      siteId: auth.siteId,
      type,
      customerId: type === "site_member" ? body.customerId || null : null,
      title,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      taxId: body.taxId?.trim() || null,
      taxOffice: body.taxOffice?.trim() || null,
      addressLine: body.addressLine?.trim() || null,
      city: body.city?.trim() || null,
      district: body.district?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json({ counterparty: row });
}
