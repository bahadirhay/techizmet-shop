import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const templates = await prisma.financeInvoiceLineTemplate.findMany({
    where: { siteId: auth.siteId, active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    description?: string;
    unit?: string;
    unitPriceTl?: number;
    vatRate?: number;
    notes?: string;
    sortOrder?: number;
  };

  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json({ error: "Açıklama zorunlu." }, { status: 400 });
  }
  if (typeof body.unitPriceTl !== "number" || body.unitPriceTl < 0) {
    return NextResponse.json({ error: "Geçerli bir birim fiyat girin." }, { status: 400 });
  }

  const template = await prisma.financeInvoiceLineTemplate.create({
    data: {
      siteId: auth.siteId,
      description,
      unit: body.unit?.trim() || "adet",
      unitPriceTl: body.unitPriceTl,
      vatRate: body.vatRate ?? 20,
      notes: body.notes?.trim() || null,
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return NextResponse.json({ template });
}
