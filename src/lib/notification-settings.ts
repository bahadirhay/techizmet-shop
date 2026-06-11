import type {
  EmailTemplateKey,
  SiteSettings,
  StoreEmailNotificationSettings,
  StoreSmsNotificationSettings,
  StoreTelegramNotificationSettings,
} from "@/lib/site-settings";

export function emailNotifications(
  settings: SiteSettings,
): StoreEmailNotificationSettings {
  const e = settings.notifications?.email ?? {};
  return {
    enabled: e.enabled !== false,
    orderConfirmation: e.orderConfirmation !== false,
    orderShipped: e.orderShipped !== false,
    orderCancelled: e.orderCancelled !== false,
    adminOnNewOrder: e.adminOnNewOrder === true,
    ...e,
  };
}

export function smsNotifications(settings: SiteSettings): StoreSmsNotificationSettings {
  const s = settings.notifications?.sms ?? {};
  return {
    enabled: s.enabled === true,
    provider: s.provider ?? "netgsm",
    orderConfirmation: s.orderConfirmation === true,
    orderShipped: s.orderShipped === true,
    ...s,
  };
}

export function resolveMailFrom(settings: SiteSettings, siteName: string): string {
  const e = emailNotifications(settings);
  const envFrom = process.env.MAIL_FROM?.trim();
  if (e.fromEmail?.trim()) {
    const name = e.fromName?.trim() || siteName;
    return `${name} <${e.fromEmail.trim()}>`;
  }
  if (envFrom) return envFrom;
  const smtpUser = settings.notifications?.smtp?.user?.trim();
  if (smtpUser?.includes("@")) {
    const name = e.fromName?.trim() || siteName;
    return `${name} <${smtpUser}>`;
  }
  const envUser = process.env.SMTP_USER?.trim();
  if (envUser?.includes("@")) {
    const name = e.fromName?.trim() || siteName;
    return `${name} <${envUser}>`;
  }
  return `${siteName} <noreply@localhost>`;
}

export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(/[,;]/).map((x) => x.trim()).filter(Boolean))];
}

export function emailEnabledForTemplate(
  settings: SiteSettings,
  key: EmailTemplateKey,
): boolean {
  const e = emailNotifications(settings);
  if (!e.enabled) return false;
  switch (key) {
    case "orderConfirmation":
      return e.orderConfirmation !== false;
    case "orderShipped":
      return e.orderShipped !== false;
    case "orderCancelled":
      return e.orderCancelled !== false;
    default:
      return true;
  }
}

export function smsEnabledForEvent(
  settings: SiteSettings,
  event: "orderConfirmation" | "orderShipped",
): boolean {
  const s = smsNotifications(settings);
  if (!s.enabled) return false;
  if (event === "orderConfirmation") return s.orderConfirmation === true;
  if (event === "orderShipped") return s.orderShipped === true;
  return false;
}

export function telegramNotifications(settings: SiteSettings): StoreTelegramNotificationSettings {
  const t = settings.notifications?.telegram ?? {};
  return {
    onNewOrder: t.onNewOrder !== false,
    ...t,
    enabled: t.enabled === true,
  };
}

/** Bildirim gönderilebilir mi */
export function telegramReady(settings: SiteSettings): boolean {
  const t = settings.notifications?.telegram ?? {};
  return Boolean(t.enabled && t.botToken?.trim() && t.chatId?.trim() && t.onNewOrder !== false);
}
