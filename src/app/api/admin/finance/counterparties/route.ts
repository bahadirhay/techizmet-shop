import { NextResponse } from "next/server";
import { buildCustomerCounterpartyPrefill } from "@/lib/finance/customer-counterparty-prefill";
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

  if (type === "site_member") {
    const customerId = body.customerId?.trim();
    if (!customerId) {
      return NextResponse.json({ error: "Site üyesi seçin." }, { status: 400 });
    }
    const existingCp = await prisma.financeCounterparty.findFirst({
      where: { siteId: auth.siteId, customerId, active: true },
      select: { id: true, title: true },
    });
    if (existingCp) {
      return NextResponse.json(
        { error: `Bu üye zaten cari olarak kayıtlı (${existingCp.title}).` },
        { status: 400 },
      );
    }
    const prefill = await buildCustomerCounterpartyPrefill(auth.siteId, customerId);
    if (!prefill) {
      return NextResponse.json({ error: "Üye bulunamadı." }, { status: 404 });
    }
    const row = await prisma.financeCounterparty.create({
      data: {
        siteId: auth.siteId,
        type,
        customerId,
        title: body.title?.trim() || prefill.title,
        email: body.email?.trim() || prefill.email,
        phone: body.phone?.trim() || prefill.phone,
        taxId: body.taxId?.trim() || prefill.taxId,
        taxOffice: body.taxOffice?.trim() || prefill.taxOffice,
        addressLine: body.addressLine?.trim() || prefill.addressLine,
        city: body.city?.trim() || prefill.city,
        district: body.district?.trim() || prefill.district,
        notes: body.notes?.trim() || null,
      },
    });
    return NextResponse.json({ counterparty: row });
  }

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
      customerId: null,
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
