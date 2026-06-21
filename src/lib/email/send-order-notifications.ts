import { formatTry } from "@/lib/format";
import {
  emailNotifications,
  parseAdminEmails,
  smsEnabledForEvent,
  smsNotifications,
} from "@/lib/notification-settings";
import { renderSmsBody, sendSms } from "@/lib/sms/send-sms";
import { sendOrderEmailForOrderId } from "@/lib/email/send-order-email";
import { orderSourceLabel } from "@/lib/marketplace/order-source";
import { notifyTelegramNewOrder } from "@/lib/telegram/order-telegram-notify";
import type { SiteSettings } from "@/lib/site-settings";

/** Yeni sipariş Telegram bildirimi — web checkout, PayTR ve pazaryeri import */
export async function notifyTelegramForOrderId(orderId: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const orderFull = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    include: {
      site: { select: { name: true, settingsJson: true } },
      lines: { select: { title: true, qty: true } },
    },
  });
  if (!orderFull) return;

  const { parseSiteSettings } = await import("@/lib/site-settings");
  const settings = parseSiteSettings(orderFull.site?.settingsJson ?? null);
  const lines = orderFull.lines.map((l) => ({ title: l.title, qty: l.qty }));

  await notifyTelegramNewOrder(settings, orderFull.site?.name ?? "Mağaza", {
    id: orderFull.id,
    orderNumber: orderFull.orderNumber,
    totalMinor: orderFull.totalMinor,
    customerName: orderFull.customerName,
    customerEmail: orderFull.customerEmail,
    customerPhone: orderFull.customerPhone,
    paymentMethod: orderFull.paymentMethod,
    sourceLabel: orderSourceLabel(orderFull),
    lines,
  }).catch((e) => console.error("[telegram]", e));
}

export async function notifyNewOrder(orderId: string, settings: SiteSettings, siteName: string) {
  const e = emailNotifications(settings);
  if (!e.enabled || !e.adminOnNewOrder) return;

  const admins = parseAdminEmails(e.adminRecipients);
  if (!admins.length) return;

  const { prisma } = await import("@/lib/prisma");
  const order = await prisma.storeOrder.findUnique({ where: { id: orderId } });
  if (!order) return;

  const { sendTemplateEmail } = await import("@/lib/email/send-template-email");
  const { resolveMailFrom } = await import("@/lib/notification-settings");
  const subject = `Yeni sipariş #${order.orderNumber}`;
  const html = `<p><strong>${siteName}</strong> — yeni sipariş.</p>
<p>Sipariş: <strong>${order.orderNumber}</strong><br/>
Tutar: ${formatTry(order.totalMinor)}<br/>
Müşteri: ${order.customerName ?? "—"}<br/>
E-posta: ${order.customerEmail ?? "—"}</p>
<p><a href="${process.env.NEXT_PUBLIC_STORE_URL ?? ""}/admin/orders/${order.id}">Panelde aç</a></p>`;

  await Promise.all(
    admins.map((to) =>
      sendTemplateEmail({
        to,
        subject,
        html,
        from: resolveMailFrom(settings, siteName),
        replyTo: e.replyTo,
        settings,
      }).catch((err) => console.error("[email admin]", err)),
    ),
  );
}

export async function notifyOrderSmsIfEnabled(
  orderId: string,
  settings: SiteSettings,
  event: "orderConfirmation" | "orderShipped",
) {
  if (!smsEnabledForEvent(settings, event)) return { sent: false };

  const { prisma } = await import("@/lib/prisma");
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    include: { site: { select: { name: true } } },
  });
  if (!order?.customerPhone?.trim()) return { sent: false, reason: "no_phone" };

  const sms = smsNotifications(settings);
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL?.replace(/\/$/, "") ?? "";
  const body = renderSmsBody(sms.defaultBody, {
    storeName: order.site?.name ?? "Mağaza",
    orderNumber: order.orderNumber,
    total: formatTry(order.totalMinor),
    storeUrl,
  });

  return sendSms({
    to: order.customerPhone,
    message: body,
    config: sms,
  });
}

export async function sendOrderConfirmationBundle(orderId: string) {
  const { prisma } = await import("@/lib/prisma");
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    select: { siteId: true },
  });
  if (order) {
    try {
      const { recordStreetFoodContributionOnPayment } = await import("@/lib/street-food-fund/contribution");
      await recordStreetFoodContributionOnPayment(order.siteId, orderId);
    } catch (e) {
      console.error("[street-food-fund]", e);
    }
  }

  await sendOrderEmailForOrderId(orderId, "orderConfirmation").catch((e) =>
    console.error("[email]", e),
  );
  const orderFull = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    include: {
      site: { select: { name: true, settingsJson: true } },
    },
  });
  if (!orderFull) return;
  const { parseSiteSettings } = await import("@/lib/site-settings");
  const settings = parseSiteSettings(orderFull.site?.settingsJson ?? null);
  await notifyNewOrder(orderId, settings, orderFull.site?.name ?? "Mağaza").catch((e) =>
    console.error("[email admin]", e),
  );
  await notifyOrderSmsIfEnabled(orderId, settings, "orderConfirmation").catch((e) =>
    console.error("[sms]", e),
  );

  await notifyTelegramForOrderId(orderId);
}
