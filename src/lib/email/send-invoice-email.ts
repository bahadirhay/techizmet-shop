import "server-only";

import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { sendTemplateEmail } from "@/lib/email/send-template-email";
import { emailNotifications, resolveMailFrom } from "@/lib/notification-settings";

export type SendInvoiceEmailResult = {
  sent: boolean;
  reason?: string;
  detail?: string;
};

function parseMeta(raw: string | null | undefined): Record<string, unknown> {
  if (!raw?.trim()) return {};
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInvoiceEmailHtml(params: {
  storeName: string;
  customerName: string;
  orderNumber: string;
  invoiceNumber: string | null;
  invoiceLink: string;
}): string {
  const { storeName, customerName, orderNumber, invoiceNumber, invoiceLink } = params;
  const greetingName = customerName.trim() ? escapeHtml(customerName.trim()) : "Değerli müşterimiz";
  const invoiceNoLine = invoiceNumber?.trim()
    ? `<p style="margin:0 0 8px;color:#3f5164;">Fatura no: <strong>${escapeHtml(invoiceNumber.trim())}</strong></p>`
    : "";
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:'Segoe UI',system-ui,sans-serif;color:#3f5164;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px 26px;box-shadow:0 2px 12px rgba(0,0,0,.06);">
    <h1 style="margin:0 0 16px;font-size:18px;color:#1f2a37;">${escapeHtml(storeName)} — Faturanız hazır</h1>
    <p style="margin:0 0 14px;line-height:1.6;">Merhaba ${greetingName},</p>
    <p style="margin:0 0 14px;line-height:1.6;">
      <strong>${escapeHtml(orderNumber)}</strong> numaralı siparişinize ait e-Arşiv faturanız düzenlendi.
      Faturanızı aşağıdaki bağlantıdan görüntüleyebilir, yazdırabilir veya PDF olarak kaydedebilirsiniz.
    </p>
    ${invoiceNoLine}
    <p style="margin:22px 0;text-align:center;">
      <a href="${escapeHtml(invoiceLink)}" target="_blank" rel="noreferrer"
         style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
        Faturayı görüntüle
      </a>
    </p>
    <p style="margin:0 0 8px;line-height:1.6;font-size:13px;color:#6b7a89;">
      Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br />
      <a href="${escapeHtml(invoiceLink)}" style="color:#16a34a;word-break:break-all;">${escapeHtml(invoiceLink)}</a>
    </p>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:22px 0;" />
    <p style="margin:0;font-size:12px;color:#9ca3af;">
      Bu e-posta ${escapeHtml(storeName)} tarafından siparişiniz için otomatik gönderilmiştir.
    </p>
  </div>
</body>
</html>`;
}

/**
 * Web sipariş faturasının public linkini müşteriye e-posta ile gönderir.
 * Dosya EKLENMEZ/SAKLANMAZ; link her açıldığında fatura GİB'den canlı çekilir.
 * `force` olmadan: yalnızca imzalı fatura, e-posta bildirimleri açıkken ve daha önce
 * gönderilmemişse gönderir (otomatik akış). `force` ile: elle tekrar gönderim.
 */
export async function sendInvoiceEmailForOrder(
  orderId: string,
  options: { force?: boolean } = {},
): Promise<SendInvoiceEmailResult> {
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      siteId: true,
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      invoiceLink: true,
      invoiceNumber: true,
      invoiceStatus: true,
      invoiceMetaJson: true,
      site: { select: { name: true } },
    },
  });
  if (!order) return { sent: false, reason: "order_not_found" };
  if (!order.customerEmail?.trim()) return { sent: false, reason: "no_email" };
  if (!order.invoiceLink?.trim()) return { sent: false, reason: "no_invoice" };

  const finalized =
    order.invoiceStatus === "signed" || order.invoiceStatus === "marketplace_sent";
  if (!finalized && !options.force) return { sent: false, reason: "not_finalized" };

  const meta = parseMeta(order.invoiceMetaJson);
  if (meta.customerEmailSentAt && !options.force) return { sent: false, reason: "already_sent" };

  const settings = await getSiteSettings(order.siteId);
  if (!options.force && emailNotifications(settings).enabled === false) {
    return { sent: false, reason: "disabled" };
  }

  const storeName = order.site?.name?.trim() || "Mağaza";
  const subject = `${storeName} — Faturanız (Sipariş ${order.orderNumber})`;
  const html = buildInvoiceEmailHtml({
    storeName,
    customerName: order.customerName ?? "",
    orderNumber: order.orderNumber,
    invoiceNumber: order.invoiceNumber,
    invoiceLink: order.invoiceLink.trim(),
  });

  const result = await sendTemplateEmail({
    to: order.customerEmail.trim(),
    subject,
    html,
    from: resolveMailFrom(settings, storeName),
    replyTo: emailNotifications(settings).replyTo,
    bcc: emailNotifications(settings).invoiceBcc,
    settings,
  });

  if (result.sent) {
    meta.customerEmailSentAt = new Date().toISOString();
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: { invoiceMetaJson: JSON.stringify(meta) },
    });
  }

  return result;
}

function buildInvoicePdfEmailHtml(params: {
  storeName: string;
  customerName: string;
  orderNumber: string;
}): string {
  const { storeName, customerName, orderNumber } = params;
  const greetingName = customerName.trim() ? escapeHtml(customerName.trim()) : "Değerli müşterimiz";
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:'Segoe UI',system-ui,sans-serif;color:#3f5164;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px 26px;box-shadow:0 2px 12px rgba(0,0,0,.06);">
    <h1 style="margin:0 0 16px;font-size:18px;color:#1f2a37;">${escapeHtml(storeName)} — Faturanız</h1>
    <p style="margin:0 0 14px;line-height:1.6;">Merhaba ${greetingName},</p>
    <p style="margin:0 0 14px;line-height:1.6;">
      <strong>${escapeHtml(orderNumber)}</strong> numaralı siparişinize ait faturanız bu e-postanın
      ekinde <strong>PDF</strong> olarak yer almaktadır.
    </p>
    <p style="margin:0 0 14px;line-height:1.6;">İyi günler dileriz.</p>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:22px 0;" />
    <p style="margin:0;font-size:12px;color:#9ca3af;">
      Bu e-posta ${escapeHtml(storeName)} tarafından siparişiniz için gönderilmiştir.
    </p>
  </div>
</body>
</html>`;
}

/**
 * Elle (GİB portalından) kesilmiş PDF faturayı müşterinin kayıtlı e-postasına EK olarak gönderir.
 * PDF sunucuda SAKLANMAZ; yalnızca gönderilir. Gönderim zamanı + dosya adı meta'ya not düşülür.
 */
export async function sendInvoicePdfToCustomer(
  orderId: string,
  input: { pdf: Buffer; filename: string; toEmail?: string },
): Promise<SendInvoiceEmailResult> {
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      siteId: true,
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      invoiceMetaJson: true,
      site: { select: { name: true } },
    },
  });
  if (!order) return { sent: false, reason: "order_not_found" };

  const to = (input.toEmail?.trim() || order.customerEmail?.trim() || "").trim();
  if (!to) return { sent: false, reason: "no_email" };
  if (!input.pdf?.length) return { sent: false, reason: "no_file" };

  const settings = await getSiteSettings(order.siteId);
  const storeName = order.site?.name?.trim() || "Mağaza";
  const subject = `${storeName} — Faturanız (Sipariş ${order.orderNumber})`;
  const html = buildInvoicePdfEmailHtml({
    storeName,
    customerName: order.customerName ?? "",
    orderNumber: order.orderNumber,
  });

  const safeName = input.filename.trim().toLowerCase().endsWith(".pdf")
    ? input.filename.trim()
    : `${input.filename.trim() || `fatura-${order.orderNumber}`}.pdf`;

  const result = await sendTemplateEmail({
    to,
    subject,
    html,
    from: resolveMailFrom(settings, storeName),
    replyTo: emailNotifications(settings).replyTo,
    bcc: emailNotifications(settings).invoiceBcc,
    settings,
    attachments: [{ filename: safeName, content: input.pdf, contentType: "application/pdf" }],
  });

  if (result.sent) {
    const meta = parseMeta(order.invoiceMetaJson);
    meta.customerPdfSentAt = new Date().toISOString();
    meta.customerPdfFileName = safeName;
    meta.customerPdfSentTo = to;
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: { invoiceMetaJson: JSON.stringify(meta) },
    });
  }

  return result;
}
