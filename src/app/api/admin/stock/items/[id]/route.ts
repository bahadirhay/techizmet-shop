import { NextResponse } from "next/server";
import { applyManualStockAdjustment } from "@/lib/stock/manual-entry";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    sku?: string;
    barcode?: string | null;
    imageUrl?: string | null;
    lowStockThreshold?: number;
    active?: boolean;
    adjustmentQty?: number;
    adjustmentNote?: string;
  };

  const item = await prisma.stockItem.findFirst({ where: { id, siteId: auth.siteId } });
  if (!item) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    if (body.adjustmentQty != null && body.adjustmentQty !== 0) {
      await applyManualStockAdjustment(tx, {
        siteId: auth.siteId,
        stockItemId: item.id,
        qty: Number(body.adjustmentQty),
        note: body.adjustmentNote,
        staffUserId: auth.staffUserId,
      });
    }

    await tx.stockItem.update({
      where: { id: item.id },
      data: {
        name: body.name?.trim() || undefined,
        sku: body.sku !== undefined ? body.sku.trim() || null : undefined,
        barcode: body.barcode !== undefined ? body.barcode?.trim() || null : undefined,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl?.trim() || null : undefined,
        lowStockThreshold:
          body.lowStockThreshold != null ? Math.max(0, Math.trunc(body.lowStockThreshold)) : undefined,
        active: body.active,
      },
    });
  });

  const updated = await prisma.stockItem.findUnique({ where: { id } });
  return NextResponse.json({ item: updated });
}
