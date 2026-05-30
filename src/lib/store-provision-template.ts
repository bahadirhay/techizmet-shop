import type { ShopLocale } from "@/lib/i18n/locale";
import type { SiteSettings } from "@/lib/site-settings";

export const EMPTY_STORE_HEADER_MENU = [
  { labelTr: "Ana Sayfa", labelEn: "Home", linkType: "page" as const, linkTarget: "home" },
  {
    labelTr: "Mağaza",
    labelEn: "Shop",
    linkType: "page" as const,
    linkTarget: "collections-all",
  },
  { labelTr: "Hakkımızda", labelEn: "About", linkType: "page" as const, linkTarget: "about" },
  { labelTr: "İletişim", labelEn: "Contact", linkType: "page" as const, linkTarget: "contact" },
];

export function buildEmptyStoreSettings(input: {
  siteName: string;
  publicUrl?: string;
  locale?: ShopLocale;
}): SiteSettings {
  const locale = input.locale ?? "tr";
  return {
    theme: {
      homepageMode: "blocks",
      navItems: EMPTY_STORE_HEADER_MENU.map((item) => ({
        id: item.linkTarget,
        href:
          item.linkTarget === "home"
            ? "/"
            : item.linkTarget === "collections-all"
              ? "/collections/all"
              : item.linkTarget === "about"
                ? "/pages/about"
                : item.linkTarget === "contact"
                  ? "/pages/contact"
                  : "/",
        labelTr: item.labelTr,
        labelEn: item.labelEn,
        visible: true,
      })),
      footer: {
        columns: [
          {
            id: "f1",
            titleTr: input.siteName,
            titleEn: input.siteName,
            links: [
              { id: "f1a", labelTr: "İletişim", labelEn: "Contact", href: "/pages/contact" },
            ],
          },
        ],
        legalLine: `© ${new Date().getFullYear()} ${input.siteName}`,
      },
    },
    branding: {
      faviconUrl: "/favicon.ico",
    },
    seo: {
      siteTitle: input.siteName,
      metaDescription:
        locale === "tr"
          ? `${input.siteName} — online mağaza`
          : `${input.siteName} — online store`,
      robotsIndex: false,
    },
    payment: { codEnabled: true, bankTransferEnabled: true },
    store: { freeShippingOverMinor: 0, texts: {} },
    notifications: {
      email: {
        enabled: true,
        orderConfirmation: true,
        orderShipped: true,
        orderCancelled: true,
        adminOnNewOrder: false,
      },
      sms: { enabled: false, provider: "netgsm" },
      telegram: { enabled: false, onNewOrder: true },
    },
  };
}
