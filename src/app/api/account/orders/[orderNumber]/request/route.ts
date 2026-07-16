import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/account/require-customer";
import { validateOrderRequest, type OrderRequestType } from "@/lib/orders/customer-requests";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, ctx: { params: Promise<{ orderNumber: string }> }) {
  const auth = await requireCustomerApi();
  if (auth instanceof NextResponse) return auth;
  const { orderNumber } = await ctx.params;
  const body = (await req.json()) as { type?: string; reason?: string };
  const type = body.type === "refund" ? "refund" : "cancel";

  const order = await prisma.storeOrder.findFirst({
    where: {
      siteId: auth.siteId,
      orderNumber,
      customerId: auth.customer.id,
    },
    include: { lines: { select: { productId: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  const check = validateOrderRequest(order.status, type as OrderRequestType);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const reason = String(body.reason ?? "").trim();
  const note = type === "cancel" ? "Müşteri iptal talebi" : "Müşteri iade talebi";
  const adminNotes = [order.adminNotes, reason ? `${note}: ${reason}` : note].filter(Boolean).join(" · ");
  const previousStatus = order.status;

  const updated = await prisma.storeOrder.update({
    where: { id: order.id },
    data: { status: check.nextStatus, adminNotes },
  });

  // İptal → stoğu geri yaz. İade talebi (refund_requested) stok düşürmez;
  // admin "İade Edildi" yaptığında stok iade edilir.
  if (type === "cancel") {
    try {
      const { applyOrderStockRestoreOnStatusChange } = await import("@/lib/stock/order-stock");
      const { restored } = await prisma.$transaction(async (tx) => {
        return applyOrderStockRestoreOnStatusChange(tx, {
          siteId: auth.siteId,
          orderId: order.id,
          previousStatus,
          nextStatus: check.nextStatus,
        });
      });
      if (restored > 0) {
        const productIds = [
          ...new Set(order.lines.map((l) => l.productId).filter((id): id is string => Boolean(id))),
        ];
        const { syncStockToAllMarketplaces } = await import("@/lib/marketplace/stock-sync-all");
        await syncStockToAllMarketplaces(auth.siteId, productIds).catch(() => undefined);
      }
    } catch (e) {
      console.error("[stock] customer cancel restore", e);
    }
  }

  return NextResponse.json({
    ok: true,
    status: updated.status,
    message: type === "cancel" ? "Sipariş iptal edildi." : "İade talebiniz alındı. Ekibimiz inceleyecek.",
  });
}
