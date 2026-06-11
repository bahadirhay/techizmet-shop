import "server-only";

import nodemailer from "nodemailer";
import type Transporter from "nodemailer/lib/mailer";
import type { SmtpConnectionConfig } from "@/lib/email/smtp-config";

function isYandexHost(host: string): boolean {
  return /yandex\.(com|ru|tr)$/i.test(host) || host.toLowerCase().includes("yandex");
}

/** SMTP bağlantısı — ayar başına yeni transport (panel/env değişince güncel kalır) */
export function createSmtpTransport(config: SmtpConnectionConfig): Transporter {
  const { host, port, secure, user, password, tlsRejectUnauthorized } = config;
  const useStartTls = !secure && (port === 587 || port === 25);
  const yandex = isYandexHost(host);

  const tlsBase = {
    minVersion: "TLSv1.2" as const,
    servername: host,
    ...(tlsRejectUnauthorized ? {} : { rejectUnauthorized: false }),
  };

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: useStartTls || (yandex && port === 587),
    auth: user && password ? { user, pass: password } : undefined,
    tls: tlsBase,
    connectionTimeout: 25_000,
    greetingTimeout: 25_000,
    socketTimeout: 35_000,
    ...(yandex ? { pool: false } : {}),
  });
}
