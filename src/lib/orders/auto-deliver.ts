import "server-only";

import { sendOrderStatusEmailIfNeeded } from "@/lib/email/send-order-email";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { resolveShippedAt, withDeliveredAt } from "@/lib/orders/shipment-meta";

/** Web siparişleri: kargoya verildikten kaç gün sonra otomatik "teslim edildi" sayılsın. 0 = kapalı. */
export const DEFAULT_AUTO_DELIVER_DAYS = 7;

export function resolveAutoDeliverDays(settings: Awaited<ReturnType<typeof getSiteSettings>>): number {
  const raw = settings.store?.autoDeliverDays;
  if (raw === 0) return 0;
  if (typeof raw === "number" && raw > 0) return Math.min(raw, 60);
  return DEFAULT_AUTO_DELIVER_DAYS;
}

/**
 * `shipped` durumundaki siparişleri teslim edildi yapar.
 * - Pazaryeri: Trendyol vb. kendi cron'u ile anında güncellenir; bu yedek/fallback.
 * - Web + manuel PTT: kargoya verilme tarihinden N gün sonra otomatik tamamlanır.
 * - Geliver: webhook ile anında; bu da yedek.
 */
export async function autoDeliverShippedOrders(siteId: string): Promise<{
  scanned: number;
  delivered: number;
  autoDeliverDays: number;
}> {
  const settings = await getSiteSettings(siteId);
  const autoDeliverDays = resolveAutoDeliverDays(settings);
  if (autoDeliverDays <= 0) {
    return { scanned: 0, delivered: 0, autoDeliverDays: 0 };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - autoDeliverDays);

  const candidates = await prisma.storeOrder.findMany({
    where: { siteId, status: "shipped" },
    select: {
      id: true,
      status: true,
      shipmentMetaJson: true,
      updatedAt: true,
      marketplacePlatform: true,
    },
    take: 500,
  });

  let delivered = 0;
  for (const order of candidates) {
    const shippedAt = resolveShippedAt(order.shipmentMetaJson, order.updatedAt);
    if (shippedAt > cutoff) continue;

    const nextMeta = withDeliveredAt(order.shipmentMetaJson);
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: { status: "delivered", shipmentMetaJson: nextMeta },
    });
    await sendOrderStatusEmailIfNeeded(order.id, "shipped", "delivered").catch(() => undefined);
    delivered++;
  }

  return { scanned: candidates.length, delivered, autoDeliverDays };
}
