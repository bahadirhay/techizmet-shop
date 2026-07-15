import "server-only";

import type { SmtpConnectionConfig } from "@/lib/email/smtp-config";
import { createSmtpTransport } from "@/lib/email/smtp-transport";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export function extractEmailAddress(from: string): string {
  const trimmed = from.trim();
  const angle = trimmed.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1].trim();
  if (trimmed.includes("@")) return trimmed;
  return trimmed;
}

export function smtpErrorDetail(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { message?: string; code?: string; response?: string; responseCode?: number };
    const parts = [e.message, e.code, e.responseCode ? String(e.responseCode) : "", e.response]
      .filter(Boolean)
      .join(" — ");
    if (parts) return parts.slice(0, 500);
  }
  return err instanceof Error ? err.message.slice(0, 500) : "SMTP bağlantı hatası";
}

function yandexHint(detail: string): string | null {
  const d = detail.toLowerCase();
  if (
    d.includes("535") ||
    d.includes("authentication") ||
    d.includes("auth") ||
    d.includes("invalid login")
  ) {
    return [
      "Yandex 535 = kullanıcı veya şifre kabul edilmedi.",
      "1) id.yandex.com → Güvenlik → Uygulama şifreleri → «Posta» için yeni şifre oluşturun (2FA açıksa zorunlu).",
      "2) mail.yandex.com → Ayarlar → «E-posta istemcileri» / IMAP → «İstemciden erişime izin ver» açık olsun.",
      "3) SMTP kullanıcı tam adres olmalı: web@anatolianpaw.com",
    ].join(" ");
  }
  if (d.includes("550") || d.includes("sender") || d.includes("from")) {
    return "Gönderen adresi SMTP kullanıcısı ile aynı olmalı (ör. web@anatolianpaw.com).";
  }
  return null;
}

export async function verifySmtpConnection(
  config: SmtpConnectionConfig,
): Promise<{ ok: true } | { ok: false; detail: string; hint?: string }> {
  try {
    const transport = createSmtpTransport(config);
    await transport.verify();
    return { ok: true };
  } catch (err) {
    const detail = smtpErrorDetail(err);
    return { ok: false, detail, hint: yandexHint(detail) ?? undefined };
  }
}

export async function sendSmtpMail(params: {
  config: SmtpConnectionConfig;
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}): Promise<{ sent: boolean; reason?: string; detail?: string; hint?: string }> {
  const config = params.config;
  if (!config.user || !config.password) {
    return { sent: false, reason: "not_configured", detail: "SMTP kullanıcı veya şifre eksik" };
  }

  const authEmail = config.user.trim();
  const fromHeader = params.from.trim();
  const fromEmail = extractEmailAddress(fromHeader) || authEmail;
  const to = params.to.trim();

  try {
    const transport = createSmtpTransport(config);
    await transport.sendMail({
      from: fromHeader.includes("<") ? fromHeader : `${fromHeader} <${authEmail}>`,
      to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo?.trim() ? { replyTo: params.replyTo.trim() } : {}),
      ...(params.attachments?.length
        ? {
            attachments: params.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
              contentType: a.contentType,
            })),
          }
        : {}),
      envelope: {
        from: authEmail,
        to,
      },
    });
    return { sent: true };
  } catch (err) {
    const detail = smtpErrorDetail(err);
    console.error("[email] SMTP hata:", detail, err);
    return {
      sent: false,
      reason: "smtp_error",
      detail,
      hint: yandexHint(detail) ?? undefined,
    };
  }
}
