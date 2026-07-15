import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

/**
 * GİB portalı / pazaryeri panelinde SİSTEM DIŞINDA kesilen faturayı
 * siparişe "elle kesildi" (manual) olarak işaretler; "fatura bekliyor" listesinden düşürür.
 * `undo: true` ile işareti kaldırır (yeniden bekliyor olur).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const order = await prisma.storeOrder.findFirst({
    where: { id, siteId: auth.siteId },
    select: { id: true, invoiceStatus: true, invoiceIssuedAt: true, invoiceNumber: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    invoiceNumber?: string;
    undo?: boolean;
  };

  if (body.undo) {
    // İmzalı/pazaryeri faturayı geri alma; yalnızca elle işareti kaldır.
    if (order.invoiceStatus !== "manual") {
      return NextResponse.json(
        { error: "Yalnızca elle işaretlenmiş fatura geri alınabilir." },
        { status: 400 },
      );
    }
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: { invoiceStatus: null, invoiceIssuedAt: null },
    });
    return NextResponse.json({ ok: true, message: "Elle kesildi işareti kaldırıldı." });
  }

  if (order.invoiceStatus === "signed" || order.invoiceStatus === "marketplace_sent") {
    return NextResponse.json(
      { error: "Bu fatura zaten sistemden kesilmiş; elle işaretlemeye gerek yok." },
      { status: 400 },
    );
  }

  const invoiceNumber = body.invoiceNumber?.trim() || order.invoiceNumber || null;
  await prisma.storeOrder.update({
    where: { id: order.id },
    data: {
      invoiceStatus: "manual",
      invoiceIssuedAt: order.invoiceIssuedAt ?? new Date(),
      invoiceNumber,
    },
  });

  return NextResponse.json({ ok: true, message: "Fatura elle kesildi olarak işaretlendi." });
}
