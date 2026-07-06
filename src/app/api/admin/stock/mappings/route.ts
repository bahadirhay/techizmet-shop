import { NextResponse } from "next/server";
import { normalizeStockDescription } from "@/lib/stock/units";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const mappings = await prisma.financeInvoiceLineStockMapping.findMany({
    where: { siteId: auth.siteId },
    include: { stockItem: { select: { id: true, name: true, unit: true, kind: true } } },
    orderBy: { descriptionNorm: "asc" },
  });

  return NextResponse.json({ mappings });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    description?: string;
    stockItemId?: string;
    invoiceUnit?: string;
  };

  const description = body.description?.trim();
  const stockItemId = body.stockItemId?.trim();
  if (!description || !stockItemId) {
    return NextResponse.json({ error: "Açıklama ve stok kartı zorunlu." }, { status: 400 });
  }

  const item = await prisma.stockItem.findFirst({
    where: { id: stockItemId, siteId: auth.siteId, active: true },
  });
  if (!item) return NextResponse.json({ error: "Stok kartı bulunamadı." }, { status: 404 });

  const mapping = await prisma.financeInvoiceLineStockMapping.upsert({
    where: {
      siteId_descriptionNorm: {
        siteId: auth.siteId,
        descriptionNorm: normalizeStockDescription(description),
      },
    },
    create: {
      siteId: auth.siteId,
      descriptionNorm: normalizeStockDescription(description),
      stockItemId: item.id,
      invoiceUnit: body.invoiceUnit?.trim() || "adet",
    },
    update: {
      stockItemId: item.id,
      invoiceUnit: body.invoiceUnit?.trim() || "adet",
    },
    include: { stockItem: true },
  });

  return NextResponse.json({ mapping });
}
