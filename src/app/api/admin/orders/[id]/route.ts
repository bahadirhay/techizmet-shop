import { NextResponse } from "next/server";
import { sendOrderStatusEmailIfNeeded } from "@/lib/email/send-order-email";
import { canTransitionOrderStatus } from "@/lib/orders/card-payment-rules";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const order = await prisma.storeOrder.findFirst({
    where: { id, siteId: auth.siteId },
    include: { lines: true, carrier: true, customer: true },
  });
  if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeOrder.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const newStatus = body.status != null ? String(body.status) : existing.status;
  const newPaymentStatus =
    body.paymentStatus != null ? String(body.paymentStatus) : existing.paymentStatus;

  const statusGuard = canTransitionOrderStatus(
    { paymentMethod: existing.paymentMethod, paymentStatus: newPaymentStatus },
    newStatus,
  );
  if (!statusGuard.ok) {
    return NextResponse.json({ error: statusGuard.error }, { status: 400 });
  }

  const order = await prisma.storeOrder.update({
    where: { id },
    data: {
      status: body.status != null ? newStatus : undefined,
      carrierId: body.carrierId !== undefined ? String(body.carrierId ?? "").trim() || null : undefined,
      trackingNumber:
        body.trackingNumber !== undefined ? String(body.trackingNumber).trim() || null : undefined,
      paymentStatus: body.paymentStatus != null ? newPaymentStatus : undefined,
      adminNotes: body.adminNotes !== undefined ? String(body.adminNotes).trim() || null : undefined,
    },
    include: { lines: true, carrier: true },
  });

  try {
    const { recordStreetFoodContributionOnPayment } = await import("@/lib/street-food-fund/contribution");
    await recordStreetFoodContributionOnPayment(auth.siteId, order.id);
  } catch (e) {
    console.error("[street-food-fund]", e);
  }

  if (body.status != null && newStatus !== existing.status) {
    const { isOrderStockRestoreStatus, restoreOrderStockMovements } = await import(
      "@/lib/stock/order-stock"
    );
    if (isOrderStockRestoreStatus(newStatus) && !isOrderStockRestoreStatus(existing.status)) {
        try {
          await prisma.$transaction(async (tx) => {
            await restoreOrderStockMovements(tx, {
              siteId: auth.siteId,
              orderId: order.id,
              staffUserId: auth.staffUserId,
            });
          });
          const productIds = [
            ...new Set(order.lines.map((l) => l.productId).filter((id): id is string => Boolean(id))),
          ];
          const { syncStockToAllMarketplaces } = await import("@/lib/marketplace/stock-sync-all");
          await syncStockToAllMarketplaces(auth.siteId, productIds).catch(() => undefined);
        } catch (e) {
          console.error("[stock] order restore", e);
        }
    }

    await sendOrderStatusEmailIfNeeded(order.id, existing.status, newStatus).catch((e) =>
      console.error("[email] status", e),
    );

    // Oto-fatura: kargoya verildi → fatura kes
    if (newStatus === "shipped" && !existing.invoiceStatus || (newStatus === "shipped" && existing.invoiceStatus === "none")) {
      const { getEfaturaConfig } = await import("@/lib/efatura/settings");
      const cfg = await getEfaturaConfig(auth.siteId).catch(() => null);
      if (cfg?.autoInvoiceOnShip && cfg.enabled) {
        const { issueOrderInvoice } = await import("@/lib/efatura/order-invoice");
        issueOrderInvoice(auth.siteId, order.id).catch((e) =>
          console.error("[auto-invoice]", e),
        );
      }
    }
  }

  return NextResponse.json({ order });
}
