import "server-only";

import nodemailer from "nodemailer";
import type Transporter from "nodemailer/lib/mailer";
import type { SmtpConnectionConfig } from "@/lib/email/smtp-config";

/** SMTP bağlantısı — ayar başına yeni transport (panel/env değişince güncel kalır) */
export function createSmtpTransport(config: SmtpConnectionConfig): Transporter {
  const { host, port, secure, user, password, tlsRejectUnauthorized } = config;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && password ? { user, pass: password } : undefined,
    tls: tlsRejectUnauthorized ? undefined : { rejectUnauthorized: false },
  });
}
