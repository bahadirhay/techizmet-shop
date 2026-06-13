import type { SiteSettings, StoreSmtpSettings } from "@/lib/site-settings";

function mergePaytrSettings(
  current: NonNullable<SiteSettings["payment"]>["paytr"] | undefined,
  patch: NonNullable<SiteSettings["payment"]>["paytr"] | undefined,
) {
  if (!patch) return current;
  const next = { ...current, ...patch };
  if (!patch.merchantKey?.trim()) next.merchantKey = current?.merchantKey;
  if (!patch.merchantSalt?.trim()) next.merchantSalt = current?.merchantSalt;
  return next;
}

function mergeSmtpSettings(
  current: StoreSmtpSettings | undefined,
  patch: StoreSmtpSettings,
): StoreSmtpSettings {
  const next = { ...current, ...patch };
  if (patch.password === "" || patch.password === undefined) {
    next.password = current?.password;
  }
  if (patch.resendApiKey === "" || patch.resendApiKey === undefined) {
    next.resendApiKey = current?.resendApiKey;
  }
  return next;
}

/** PATCH gövdesi — iç içe theme/branding/seo kaybını önler */
export function mergeSiteSettings(current: SiteSettings, patch: SiteSettings): SiteSettings {
  return {
    ...current,
    ...patch,
    theme: patch.theme
      ? {
          ...current.theme,
          ...patch.theme,
          mirrorPages: patch.theme.mirrorPages
            ? { ...current.theme?.mirrorPages, ...patch.theme.mirrorPages }
            : current.theme?.mirrorPages,
          mirrorPagesMeta: patch.theme.mirrorPagesMeta
            ? { ...current.theme?.mirrorPagesMeta, ...patch.theme.mirrorPagesMeta }
            : current.theme?.mirrorPagesMeta,
          navItems: patch.theme.navItems ?? current.theme?.navItems,
          footer: patch.theme.footer ?? current.theme?.footer,
        }
      : current.theme,
    branding: patch.branding ? { ...current.branding, ...patch.branding } : current.branding,
    seo: patch.seo
      ? {
          ...current.seo,
          ...patch.seo,
          staticPages:
            patch.seo.staticPages !== undefined
              ? { ...current.seo?.staticPages, ...patch.seo.staticPages }
              : current.seo?.staticPages,
        }
      : current.seo,
    payment: patch.payment
      ? {
          ...current.payment,
          ...patch.payment,
          paytr: patch.payment.paytr
            ? mergePaytrSettings(current.payment?.paytr, patch.payment.paytr)
            : current.payment?.paytr,
          iyzico: patch.payment.iyzico
            ? { ...current.payment?.iyzico, ...patch.payment.iyzico }
            : current.payment?.iyzico,
        }
      : current.payment,
    email: patch.email
      ? {
          ...current.email,
          ...patch.email,
          templates: patch.email.templates
            ? { ...current.email?.templates, ...patch.email.templates }
            : current.email?.templates,
        }
      : current.email,
    notifications: patch.notifications
      ? {
          ...current.notifications,
          ...patch.notifications,
          email: patch.notifications.email
            ? { ...current.notifications?.email, ...patch.notifications.email }
            : current.notifications?.email,
          smtp: patch.notifications.smtp
            ? mergeSmtpSettings(current.notifications?.smtp, patch.notifications.smtp)
            : current.notifications?.smtp,
          sms: patch.notifications.sms
            ? { ...current.notifications?.sms, ...patch.notifications.sms }
            : current.notifications?.sms,
          telegram: patch.notifications.telegram
            ? { ...current.notifications?.telegram, ...patch.notifications.telegram }
            : current.notifications?.telegram,
        }
      : current.notifications,
    store: patch.store
      ? {
          ...current.store,
          ...patch.store,
          texts: patch.store.texts
            ? {
                ...current.store?.texts,
                ...patch.store.texts,
                blocks: patch.store.texts.blocks
                  ? { ...current.store?.texts?.blocks, ...patch.store.texts.blocks }
                  : current.store?.texts?.blocks,
              }
            : current.store?.texts,
        }
      : current.store,
    cookieConsentJson:
      patch.cookieConsentJson !== undefined ? patch.cookieConsentJson : current.cookieConsentJson,
    maintenance: patch.maintenance
      ? { ...current.maintenance, ...patch.maintenance }
      : current.maintenance,
    ops: patch.ops
      ? {
          ...current.ops,
          ...patch.ops,
          cron: patch.ops.cron ? { ...current.ops?.cron, ...patch.ops.cron } : current.ops?.cron,
          gsc: patch.ops.gsc !== undefined ? patch.ops.gsc : current.ops?.gsc,
        }
      : current.ops,
    customerAuth: patch.customerAuth
      ? { ...current.customerAuth, ...patch.customerAuth }
      : current.customerAuth,
    efatura: patch.efatura ? { ...current.efatura, ...patch.efatura } : current.efatura,
    seoAi: patch.seoAi ? { ...current.seoAi, ...patch.seoAi } : current.seoAi,
    blogAutomation: patch.blogAutomation
      ? { ...current.blogAutomation, ...patch.blogAutomation }
      : current.blogAutomation,
    gsc: patch.gsc ? { ...current.gsc, ...patch.gsc } : current.gsc,
    whatsapp: patch.whatsapp ? { ...current.whatsapp, ...patch.whatsapp } : current.whatsapp,
  };
}
