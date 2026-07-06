import { NextResponse } from "next/server";
import { applyManualStockAdjustment } from "@/lib/stock/manual-entry";
import { StockError } from "@/lib/stock/movements";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

/** Manuel stok girişi / çıkışı — pozitif veya negatif miktar */
export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    stockItemId?: string;
    qty?: number;
    note?: string;
    occurredAt?: string;
  };

  const stockItemId = body.stockItemId?.trim();
  if (!stockItemId) {
    return NextResponse.json({ error: "Stok kartı seçin." }, { status: 400 });
  }
  if (body.qty == null || body.qty === 0) {
    return NextResponse.json({ error: "Miktar sıfır olamaz." }, { status: 400 });
  }

  try {
    const movement = await prisma.$transaction(async (tx) =>
      applyManualStockAdjustment(tx, {
        siteId: auth.siteId,
        stockItemId,
        qty: Number(body.qty),
        note: body.note,
        staffUserId: auth.staffUserId,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
      }),
    );

    const item = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
    if (item?.productId) {
      const { syncStockToAllMarketplaces } = await import("@/lib/marketplace/stock-sync-all");
      await syncStockToAllMarketplaces(auth.siteId, [item.productId]).catch(() => undefined);
    }

    return NextResponse.json({ movement, item });
  } catch (e) {
    const msg = e instanceof StockError || e instanceof Error ? e.message : "Stok girişi başarısız.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
