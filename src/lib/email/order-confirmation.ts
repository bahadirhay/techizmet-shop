import { buildOrderEmailVars } from "@/lib/email/build-order-vars";
import { renderEmailTemplate, resolveEmailTemplate } from "@/lib/email/template-render";
import { sendTemplateEmail } from "@/lib/email/send-template-email";
import { emailEnabledForTemplate, emailNotifications, resolveMailFrom } from "@/lib/notification-settings";
import type { EmailTemplateKey, SiteSettings } from "@/lib/site-settings";

export type OrderEmailPayload = {
  to: string;
  orderNumber: string;
  customerName: string;
  totalMinor: number;
  paymentMethod: string;
  trackingNumber?: string | null;
  status?: string;
  storeName: string;
  lines: { title: string; qty: number; lineMinor: number }[];
};

export async function sendOrderTemplateEmail(
  templateKey: EmailTemplateKey,
  settings: SiteSettings,
  payload: OrderEmailPayload,
): Promise<{ sent: boolean; reason?: string }> {
  if (!emailEnabledForTemplate(settings, templateKey)) {
    return { sent: false, reason: "disabled" };
  }
  const template = resolveEmailTemplate(templateKey, settings.email?.templates);
  const vars = buildOrderEmailVars({
    customerName: payload.customerName,
    orderNumber: payload.orderNumber,
    totalMinor: payload.totalMinor,
    paymentMethod: payload.paymentMethod,
    storeName: payload.storeName,
    trackingNumber: payload.trackingNumber,
    status: payload.status,
    lines: payload.lines,
  });
  const { subject, html } = renderEmailTemplate(template, vars);
  const e = emailNotifications(settings);
  return sendTemplateEmail({
    to: payload.to,
    subject,
    html,
    from: resolveMailFrom(settings, payload.storeName),
    replyTo: e.replyTo,
  });
}

/** Geriye dönük uyumluluk */
export async function sendOrderConfirmationEmail(
  payload: Omit<OrderEmailPayload, "storeName"> & { storeName?: string },
  settings?: SiteSettings,
): Promise<{ sent: boolean; reason?: string }> {
  return sendOrderTemplateEmail(
    "orderConfirmation",
    settings ?? {},
    {
      ...payload,
      storeName: payload.storeName ?? "Mağazamız",
    },
  );
}
