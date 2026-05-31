import "server-only";

import nodemailer from "nodemailer";
import type Transporter from "nodemailer/lib/mailer";

type GlobalSmtp = { transporter?: Transporter | null; checked?: boolean };

const globalSmtp = globalThis as unknown as GlobalSmtp;

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

/** SMTP — kendi mail sunucunuz (Hostixo / Plesk / alan adı postası) */
export function getSmtpTransport(): Transporter | null {
  if (globalSmtp.checked) return globalSmtp.transporter ?? null;

  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    globalSmtp.checked = true;
    globalSmtp.transporter = null;
    return null;
  }

  const port = Number(process.env.SMTP_PORT?.trim() || 587);
  const secure = process.env.SMTP_SECURE?.trim() === "true" || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim() || process.env.SMTP_PASS?.trim();

  globalSmtp.transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    tls: process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "false" ? { rejectUnauthorized: false } : undefined,
  });
  globalSmtp.checked = true;
  return globalSmtp.transporter;
}
