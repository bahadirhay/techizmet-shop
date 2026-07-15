import "server-only";

import {
  emailTransportProvider,
  emailTransportReady,
  resolveResendApiKey,
  resolveSmtpConfig,
} from "@/lib/email/smtp-config";
import { sendSmtpMail, type EmailAttachment } from "@/lib/email/smtp-send";
import { resolveMailFrom } from "@/lib/notification-settings";
import type { SiteSettings } from "@/lib/site-settings";

/** Resend API, SMTP (panel veya .env) veya konsol (geliştirme) */

export async function sendTemplateEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  settings?: SiteSettings;
  siteName?: string;
  /** Test SMTP — Resend yedeklemesini atla */
  smtpOnly?: boolean;
  /** E-posta ekleri (PDF fatura vb.) */
  attachments?: EmailAttachment[];
}): Promise<{ sent: boolean; reason?: string; detail?: string; hint?: string }> {
  if (!params.to?.trim()) return { sent: false, reason: "no_email" };

  const settings = params.settings ?? {};
  const siteName = params.siteName?.trim() || "Mağaza";
  const from =
    params.from?.trim() ||
    resolveMailFrom(settings, siteName) ||
    process.env.MAIL_FROM?.trim() ||
    `${siteName} <noreply@localhost>`;

  if (!emailTransportReady(settings)) {
    if (process.env.NODE_ENV === "development") {
      console.log("[email]", params.subject, "→", params.to);
    }
    return { sent: false, reason: "not_configured" };
  }

  const provider = emailTransportProvider(settings);
  const trySmtpFirst = provider === "smtp" || provider === "auto";
  const tryResendFirst = provider === "resend";

  async function sendViaSmtp() {
    const config = resolveSmtpConfig(settings);
    if (!config) return { sent: false as const, reason: "not_configured" as const };
    return sendSmtpMail({
      config,
      from,
      to: params.to.trim(),
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
      attachments: params.attachments,
    });
  }

  async function sendViaResend() {
    const apiKey = resolveResendApiKey(settings);
    if (!apiKey) return { sent: false as const, reason: "not_configured" as const };
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.replyTo?.trim() ? { reply_to: params.replyTo.trim() } : {}),
        ...(params.attachments?.length
          ? {
              attachments: params.attachments.map((a) => ({
                filename: a.filename,
                content: a.content.toString("base64"),
                ...(a.contentType ? { content_type: a.contentType } : {}),
              })),
            }
          : {}),
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Resend hata:", err);
      return { sent: false as const, reason: "api_error" as const, detail: err.slice(0, 400) };
    }
    return { sent: true as const };
  }

  if (tryResendFirst) {
    const r = await sendViaResend();
    if (r.sent) return r;
    if (provider === "resend") return r;
    return sendViaSmtp();
  }

  if (trySmtpFirst) {
    const s = await sendViaSmtp();
    if (s.sent) return s;
    if (provider === "smtp" || params.smtpOnly) return s;
    return sendViaResend();
  }

  return { sent: false, reason: "not_configured" };
}

export type { EmailTemplateKey } from "@/lib/site-settings";
