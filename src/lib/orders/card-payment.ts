import "server-only";

import { prisma } from "@/lib/prisma";
import { recordOrderStockMovements } from "@/lib/stock/order-stock";

export {
  canTransitionOrderStatus,
  isCardOrderAwaitingPayment,
  isOrderReadyToFulfill,
} from "@/lib/orders/card-payment-rules";

/** Kart ödemesi onaylandığında stok düş (sipariş oluşturulurken düşülmez) */
export async function recordOrderStockAfterCardPayment(siteId: string, orderId: string) {
  const existing = await prisma.stockMovement.count({
    where: { siteId, refType: "order", refId: orderId, type: "sale" },
  });
  if (existing > 0) return;

  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    include: { lines: true },
  });
  if (!order?.lines.length) return;

  const productIds = [
    ...new Set(order.lines.map((l) => l.productId).filter((id): id is string => Boolean(id))),
  ];
  const products = await prisma.storeProduct.findMany({
    where: { id: { in: productIds } },
    select: { id: true, kind: true },
  });
  const kindById = new Map(products.map((p) => [p.id, p.kind]));

  await prisma.$transaction(async (tx) => {
    await recordOrderStockMovements(tx, {
      siteId,
      orderId,
      lines: order.lines
        .filter((l): l is typeof l & { productId: string } => Boolean(l.productId))
        .map((l) => ({
          id: l.id,
          productId: l.productId,
          variantId: l.variantId,
          qty: l.qty,
          title: l.title,
        })),
      productKinds: kindById,
    });
  });
}

export async function markCardOrderPaymentFailed(orderId: string, note: string) {
  const order = await prisma.storeOrder.findUnique({ where: { id: orderId }, select: { adminNotes: true } });
  await prisma.storeOrder.update({
    where: { id: orderId },
    data: {
      paymentStatus: "failed",
      status: "cancelled",
      adminNotes: [order?.adminNotes, note].filter(Boolean).join(" · "),
    },
  });
}
