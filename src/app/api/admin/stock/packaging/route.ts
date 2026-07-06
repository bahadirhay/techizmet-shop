import { NextResponse } from "next/server";
import { runPackaging } from "@/lib/stock/packaging";
import { StockError } from "@/lib/stock/movements";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    recipeId?: string;
    outputProductId?: string;
    outputVariantId?: string;
    outputQty?: number;
    note?: string;
    occurredAt?: string;
  };

  try {
    const run = await prisma.$transaction(async (tx) =>
      runPackaging(tx, {
        siteId: auth.siteId,
        recipeId: body.recipeId,
        outputProductId: body.outputProductId?.trim() ?? "",
        outputVariantId: body.outputVariantId,
        outputQty: Number(body.outputQty ?? 0),
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
        note: body.note,
        staffUserId: auth.staffUserId,
      }),
    );

    const productIds = [run.outputProductId];
    const { syncStockToAllMarketplaces } = await import("@/lib/marketplace/stock-sync-all");
    await syncStockToAllMarketplaces(auth.siteId, productIds).catch(() => undefined);

    return NextResponse.json({ run });
  } catch (e) {
    const msg = e instanceof StockError || e instanceof Error ? e.message : "Paketleme başarısız.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
