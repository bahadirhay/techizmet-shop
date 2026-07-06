import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { recordStockMovement } from "@/lib/stock/movements";

export async function GET() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const items = await prisma.stockItem.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: {
      product: { select: { id: true, title: true, slug: true } },
      variant: { select: { id: true, label: true } },
    },
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    name?: string;
    sku?: string;
    barcode?: string;
    imageUrl?: string;
    kind?: string;
    unit?: string;
    productId?: string;
    variantId?: string;
    lowStockThreshold?: number;
    initialBalance?: number;
  };

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Ad zorunlu." }, { status: 400 });

  const kind = body.kind?.trim() || "raw_material";
  const unit = body.unit?.trim() || "adet";
  if (!["raw_material", "packaging", "finished"].includes(kind)) {
    return NextResponse.json({ error: "Geçersiz kart türü." }, { status: 400 });
  }
  if (!["kg", "adet"].includes(unit)) {
    return NextResponse.json({ error: "Birim kg veya adet olmalı." }, { status: 400 });
  }

  const initial = Math.max(0, Math.trunc(Number(body.initialBalance ?? 0)));
  const balanceBase = unit === "kg" ? Math.round(initial * 1000) : initial;

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.stockItem.create({
      data: {
        siteId: auth.siteId,
        name,
        sku: body.sku?.trim() || null,
        barcode: body.barcode?.trim() || null,
        imageUrl: body.imageUrl?.trim() || null,
        kind,
        unit,
        balanceBase: 0,
        lowStockThreshold: Math.max(0, Math.trunc(Number(body.lowStockThreshold ?? 0))),
        productId: body.productId?.trim() || null,
        variantId: body.variantId?.trim() || null,
      },
    });

    if (balanceBase > 0) {
      await recordStockMovement(tx, {
        siteId: auth.siteId,
        stockItemId: created.id,
        type: "adjustment",
        qtyBase: balanceBase,
        refType: "manual",
        refId: created.id,
        lineKey: "opening",
        note: "Açılış bakiyesi",
        staffUserId: auth.staffUserId,
      });
    }

    return tx.stockItem.findUnique({ where: { id: created.id } });
  });

  return NextResponse.json({ item });
}
