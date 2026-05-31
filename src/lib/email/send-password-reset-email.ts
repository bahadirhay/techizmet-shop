import "server-only";

import { sendTemplateEmail } from "@/lib/email/send-template-email";
import { resolveMailFrom } from "@/lib/notification-settings";
import { publicStoreBaseUrl } from "@/lib/password-reset";
import type { SiteSettings } from "@/lib/site-settings";

export async function sendCustomerPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
  siteName: string;
  settings: SiteSettings;
}): Promise<{ sent: boolean; reason?: string }> {
  const subject = `${params.siteName} — şifre sıfırlama`;
  const html = `<div style="font-family:sans-serif;line-height:1.5;color:#222;max-width:520px">
  <p>Merhaba,</p>
  <p><strong>${params.siteName}</strong> hesabınız için şifre sıfırlama talebi aldık.</p>
  <p style="margin:24px 0">
    <a href="${params.resetUrl}" style="display:inline-block;background:#b45309;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
      Yeni şifre belirle
    </a>
  </p>
  <p style="font-size:13px;color:#666">Bağlantı yaklaşık 1 saat geçerlidir. Bu talebi siz yapmadıysanız e-postayı yok sayabilirsiniz.</p>
  <p style="font-size:12px;color:#888;word-break:break-all">${params.resetUrl}</p>
</div>`;

  const e = params.settings.notifications?.email;
  return sendTemplateEmail({
    to: params.to,
    subject,
    html,
    from: resolveMailFrom(params.settings, params.siteName),
    replyTo: e?.replyTo,
  });
}

export function buildCustomerResetUrl(rawToken: string): string {
  return `${publicStoreBaseUrl()}/account/reset-password?token=${encodeURIComponent(rawToken)}`;
}
