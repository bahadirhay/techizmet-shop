import { prisma } from "@/lib/prisma";
import { sendOrderTemplateEmail } from "@/lib/email/order-confirmation";
import { getSiteSettings, type EmailTemplateKey } from "@/lib/site-settings";
async function loadOrderPayload(orderId: string) {
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    include: { lines: true, site: { select: { name: true } } },
  });
  if (!order?.customerEmail) return null;

  const settings = await getSiteSettings(order.siteId);

  return {
    settings,
    payload: {
      to: order.customerEmail,
      orderNumber: order.orderNumber,
      customerName: order.customerName ?? "",
      totalMinor: order.totalMinor,
      paymentMethod: order.paymentMethod ?? "cod",
      trackingNumber: order.trackingNumber,
      status: order.status,
      storeName: order.site?.name ?? "Mağaza",
      lines: order.lines.map((l) => ({
        title: l.title,
        qty: l.qty,
        lineMinor: l.lineMinor,
      })),
    },
  };
}

export async function sendOrderEmailForOrderId(
  orderId: string,
  templateKey: EmailTemplateKey = "orderConfirmation",
) {
  const data = await loadOrderPayload(orderId);
  if (!data) return { sent: false };

  return sendOrderTemplateEmail(templateKey, data.settings, data.payload);
}

export async function sendOrderStatusEmailIfNeeded(
  orderId: string,
  previousStatus: string,
  newStatus: string,
) {
  if (previousStatus === newStatus) return { sent: false };

  let templateKey: EmailTemplateKey | null = null;
  if (newStatus === "shipped") templateKey = "orderShipped";
  else if (newStatus === "cancelled") templateKey = "orderCancelled";
  else return { sent: false };

  const result = await sendOrderEmailForOrderId(orderId, templateKey);
  if (newStatus === "shipped") {
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      select: { siteId: true },
    });
    if (order) {
      const settings = await getSiteSettings(order.siteId);
      const { notifyOrderSmsIfEnabled } = await import("@/lib/email/send-order-notifications");
      await notifyOrderSmsIfEnabled(orderId, settings, "orderShipped").catch((e) =>
        console.error("[sms]", e),
      );
    }
  }
  return result;
}
