import type { SiteSettings, StoreSmtpSettings } from "@/lib/site-settings";

export type SmtpConnectionConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  tlsRejectUnauthorized: boolean;
};

export function smtpNotifications(settings: SiteSettings): StoreSmtpSettings {
  return settings.notifications?.smtp ?? {};
}

/** Panel ayarları → env yedek */
export function resolveSmtpConfig(settings: SiteSettings): SmtpConnectionConfig | null {
  const s = smtpNotifications(settings);
  const host = s.host?.trim() || process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const portRaw = s.port ?? Number(process.env.SMTP_PORT?.trim() || 587);
  const port = Number.isFinite(portRaw) && portRaw > 0 ? portRaw : 587;
  const secure =
    s.secure === true ||
    process.env.SMTP_SECURE?.trim() === "true" ||
    port === 465;
  const user = (s.user?.trim() || process.env.SMTP_USER?.trim() || "").replace(/\s/g, "") || undefined;
  const password =
    (s.password?.trim() ||
      process.env.SMTP_PASSWORD?.trim() ||
      process.env.SMTP_PASS?.trim() ||
      "") || undefined;
  const tlsRejectUnauthorized =
    s.tlsRejectUnauthorized === false || process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "false"
      ? false
      : true;

  return { host, port, secure, user, password, tlsRejectUnauthorized };
}

export function resolveResendApiKey(settings: SiteSettings): string | null {
  const fromDb = smtpNotifications(settings).resendApiKey?.trim();
  if (fromDb) return fromDb;
  const fromEnv = process.env.RESEND_API_KEY?.trim();
  return fromEnv || null;
}

export function emailTransportProvider(settings: SiteSettings): "smtp" | "resend" | "auto" {
  const p = smtpNotifications(settings).provider;
  if (p === "smtp" || p === "resend") return p;
  return "auto";
}

export function smtpReady(settings: SiteSettings): boolean {
  return resolveSmtpConfig(settings) !== null;
}

export function resendReady(settings: SiteSettings): boolean {
  return Boolean(resolveResendApiKey(settings));
}

export function emailTransportReady(settings: SiteSettings): boolean {
  const provider = emailTransportProvider(settings);
  if (provider === "smtp") return smtpReady(settings);
  if (provider === "resend") return resendReady(settings);
  return smtpReady(settings) || resendReady(settings);
}
