import type { EmailTemplate, EmailTemplateKey } from "@/lib/site-settings";

export const EMAIL_TEMPLATE_PLACEHOLDERS = [
  "{{customerName}}",
  "{{orderNumber}}",
  "{{total}}",
  "{{paymentMethod}}",
  "{{linesTable}}",
  "{{linesText}}",
  "{{storeName}}",
  "{{trackingNumber}}",
  "{{statusLabel}}",
] as const;

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplate> = {
  orderConfirmation: {
    subject: "Sipariş onayı {{orderNumber}}",
    bodyHtml: `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;color:#18181b;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="color:#1a5f4a;font-size:20px">Siparişiniz alındı</h1>
  <p>Merhaba {{customerName}},</p>
  <p><strong>{{orderNumber}}</strong> numaralı siparişiniz {{storeName}} tarafından kaydedildi.</p>
  {{linesTable}}
  <p style="font-size:18px"><strong>Toplam: {{total}}</strong></p>
  <p style="color:#71717a">Ödeme: {{paymentMethod}}</p>
  <p style="color:#71717a;font-size:13px">Sipariş takibi için sipariş numaranızı ve e-postanızı kullanabilirsiniz.</p>
</body></html>`,
  },
  orderShipped: {
    subject: "Siparişiniz kargoda — {{orderNumber}}",
    bodyHtml: `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;color:#18181b;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="color:#1a5f4a;font-size:20px">Kargoya verildi</h1>
  <p>Merhaba {{customerName}},</p>
  <p><strong>{{orderNumber}}</strong> numaralı siparişiniz kargoya verildi.</p>
  <p>Takip no: <strong>{{trackingNumber}}</strong></p>
  {{linesTable}}
  <p style="font-size:18px"><strong>Toplam: {{total}}</strong></p>
</body></html>`,
  },
  orderCancelled: {
    subject: "Sipariş iptali — {{orderNumber}}",
    bodyHtml: `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;color:#18181b;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px">Sipariş iptal edildi</h1>
  <p>Merhaba {{customerName}},</p>
  <p><strong>{{orderNumber}}</strong> numaralı siparişiniz iptal edilmiştir ({{statusLabel}}).</p>
  <p style="color:#71717a;font-size:13px">Sorularınız için {{storeName}} ile iletişime geçebilirsiniz.</p>
</body></html>`,
  },
};
