import { existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { getPaytrConfig } from "@/lib/payments/paytr";
import {
  DEFAULT_STORE_FOOTER,
  getStoreFooterConfig,
  type StoreFooterConfig,
} from "@/lib/store-footer";
import {
  DEFAULT_STORE_NAV,
  getStoreNavItems,
  type StoreNavItem,
} from "@/lib/store-navigation";
import type { MirrorHomeConfig } from "@/lib/mirror-home-overlay";
import { loadMirrorProductExploreLooks } from "@/lib/mirror-product-explore-server";
import {
  getProductPageBottomSettings,
  type ProductPageBottomThemeConfig,
} from "@/lib/product-page-bottom";
import { parseExploreLooksJson, type ProductExploreLook } from "@/lib/product-explore-looks";
import type { StoreTextSettings } from "@/lib/store-static-texts";

export type EmailTemplateKey = "orderConfirmation" | "orderShipped" | "orderCancelled";

export type EmailTemplate = {
  subject: string;
  bodyHtml: string;
};

export type StoreEmailNotificationSettings = {
  enabled?: boolean;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  /** Virgülle ayrılmış yönetici adresleri */
  adminRecipients?: string;
  orderConfirmation?: boolean;
  orderShipped?: boolean;
  orderCancelled?: boolean;
  adminOnNewOrder?: boolean;
};

export type SmsProvider = "netgsm";

export type StoreSmsNotificationSettings = {
  enabled?: boolean;
  provider?: SmsProvider;
  userCode?: string;
  password?: string;
  /** Netgsm mesaj başlığı */
  msgHeader?: string;
  adminPhone?: string;
  orderConfirmation?: boolean;
  orderShipped?: boolean;
  /** Varsayılan gövde — {{orderNumber}} {{total}} {{storeName}} */
  defaultBody?: string;
};

export type StoreTelegramNotificationSettings = {
  enabled?: boolean;
  botToken?: string;
  chatId?: string;
  /** Yeni sipariş oluşunca Telegram mesajı */
  onNewOrder?: boolean;
};

export type StoreNotificationSettings = {
  email?: StoreEmailNotificationSettings;
  sms?: StoreSmsNotificationSettings;
  telegram?: StoreTelegramNotificationSettings;
};

/** Ana sayfa vitrin tipi */
export type HomepageMode = "mirror" | "blocks";

export type SiteSettings = {
  theme?: {
    /** mirror = HTTrack King Noor HTML, blocks = admin DnD sayfa (home) */
    homepageMode?: HomepageMode;
    /** Vitrin üst menü (mirror + blok modunda) */
    navItems?: StoreNavItem[];
    /** Vitrin alt bilgi / footer menüleri */
    footer?: StoreFooterConfig;
    /** Tüm ürün PDP altı EXPLORE (exploreLooksJson null iken) */
    defaultProductExploreLooks?: ProductExploreLook[];
    /** Ürün PDP kayan kampanya şeridi — geriye dönük */
    defaultProductMarqueeHtml?: string;
    /** Ürün PDP alt bölümler: marquee, revealing text, video metin */
    defaultProductPageBottom?: ProductPageBottomThemeConfig;
    /** mirror index → admin home blok içe aktarma sürümü */
    mirrorHomeImportVersion?: number;
    /** King Noor ana sayfa — bölüm sırası / gizle / başlık */
    mirrorHome?: MirrorHomeConfig;
    /** Tüm vitrin sayfaları (home, collections, …) */
    mirrorPages?: Partial<Record<string, MirrorHomeConfig>>;
    mirrorPagesMeta?: Partial<Record<string, { published?: boolean }>>;
  };
  email?: {
    templates?: Partial<Record<EmailTemplateKey, EmailTemplate>>;
  };
  /** Bildirim kanalları — site başına (DB settingsJson); .env yalnızca API anahtarı */
  notifications?: StoreNotificationSettings;
  payment?: {
    paytr?: { merchantId?: string; merchantKey?: string; merchantSalt?: string; testMode?: boolean };
    iyzico?: { apiKey?: string; secretKey?: string; baseUrl?: string };
    codEnabled?: boolean;
    bankTransferEnabled?: boolean;
    bankAccounts?: { bank: string; iban: string; holder: string }[];
  };
  store?: {
    freeShippingOverMinor?: number;
    /** Web sipariş numarası öneki — örn. KN, SHOP (varsayılan: KN) */
    orderNumberPrefix?: string;
    /** Barkod boşken otomatik EAN-13 üret (ürün kaydı / içe aktarma) */
    autoGenerateBarcode?: boolean;
    /** EAN-13 ilk 3 hane — varsayılan 869 */
    barcodePrefix?: string;
    texts?: StoreTextSettings;
    /** Kargo etiketi gönderici adresi */
    shipFrom?: {
      name?: string;
      line1?: string;
      line2?: string;
      district?: string;
      city?: string;
      postalCode?: string;
      phone?: string;
    };
  };
  /** Logo, favicon */
  branding?: {
    logoUrl?: string;
    logoUrlLight?: string;
    faviconUrl?: string;
  };
  /** Site geneli SEO & izleme */
  seo?: {
    siteTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImageUrl?: string;
    googleSiteVerification?: string;
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    robotsIndex?: boolean;
    extraHeadHtml?: string;
  };
  /** KVKK çerez banner — JSON (web-page ile uyumlu) */
  cookieConsentJson?: string | null;
  /** GİB e-Arşiv portal — ücretsiz fatura kesimi */
  efatura?: StoreEfaturaSettings;
  /** Ürün SEO AI — Gemini, OpenAI, Claude */
  seoAi?: StoreSeoAiSettings;
};

export type SeoAiProvider = "auto" | "gemini" | "openai" | "claude";

export type StoreSeoAiSettings = {
  enabled?: boolean;
  /** auto = sırayla dene; veya tek sağlayıcı */
  provider?: SeoAiProvider;
  geminiApiKey?: string;
  openaiApiKey?: string;
  claudeApiKey?: string;
  geminiModel?: string;
  openaiModel?: string;
  claudeModel?: string;
};

export type StoreEfaturaSettings = {
  enabled?: boolean;
  /** true = earsivportaltest.efatura.gov.tr */
  testMode?: boolean;
  /** Fatura üzerinde görünen satıcı unvanı */
  sellerTitle?: string;
  /** Satıcı VKN */
  sellerTaxId?: string;
  /** Satıcı vergi dairesi */
  sellerTaxOffice?: string;
  /** İVD kullanıcı kodu — parola için GIB_PASSWORD env tercih edilir */
  username?: string;
  password?: string;
  /** Alıcı VKN/TCKN yoksa (B2C) */
  defaultConsumerTaxId?: string;
  /** KDV oranı (%) — fiyatlar KDV dahil kabul edilir */
  defaultVatRate?: number;
  /** Kesim sonrası otomatik imzala (SMS gerekebilir) */
  autoSign?: boolean;
  /** Pazaryeri siparişinde faturayı otomatik Trendyol'a ilet */
  autoSendMarketplace?: boolean;
};

const DEFAULT_LOGO = "/theme/king-noor/cdn/shop/files/noor-dark-logo34d3.svg";
const DEFAULT_LOGO_LIGHT = "/theme/king-noor/cdn/shop/files/noor-white-logo34d3.svg";

function brandingAssetOk(url: string | undefined): boolean {
  const u = url?.trim();
  if (!u) return false;
  if (u.startsWith("http://") || u.startsWith("https://")) return true;
  if (!u.startsWith("/")) return false;
  const rel = u.split("?")[0]!.replace(/^\//, "");
  return existsSync(join(process.cwd(), "public", rel));
}

export function getSiteBranding(settings: SiteSettings) {
  const b = settings.branding ?? {};
  const logoCandidate = b.logoUrl?.trim();
  const lightCandidate = b.logoUrlLight?.trim();
  const logoUrl = brandingAssetOk(logoCandidate) ? logoCandidate! : DEFAULT_LOGO;
  const logoUrlLight = brandingAssetOk(lightCandidate)
    ? lightCandidate!
    : brandingAssetOk(logoCandidate)
      ? logoCandidate!
      : DEFAULT_LOGO_LIGHT;
  return {
    logoUrl,
    logoUrlLight,
    faviconUrl: brandingAssetOk(b.faviconUrl?.trim()) ? b.faviconUrl!.trim() : "/favicon.ico",
  };
}

export function getSiteSeo(settings: SiteSettings, siteName: string) {
  const s = settings.seo ?? {};
  return {
    siteTitle: s.siteTitle?.trim() || siteName,
    metaDescription: s.metaDescription?.trim() || "E-ticaret vitrin",
    metaKeywords: s.metaKeywords?.trim() || "",
    ogImageUrl: s.ogImageUrl?.trim() || "",
    googleSiteVerification: s.googleSiteVerification?.trim() || "",
    googleAnalyticsId: s.googleAnalyticsId?.trim() || "",
    facebookPixelId: s.facebookPixelId?.trim() || "",
    robotsIndex: s.robotsIndex !== false,
    extraHeadHtml: s.extraHeadHtml?.trim() || "",
  };
}

export function parseSiteSettings(raw: string | null | undefined): SiteSettings {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as SiteSettings;
  } catch {
    return {};
  }
}

export async function getSiteSettings(siteId?: string): Promise<SiteSettings> {
  const site = siteId
    ? await prisma.storeSite.findUnique({ where: { id: siteId } })
    : await getDefaultSite();
  return parseSiteSettings(site?.settingsJson ?? null);
}

export function isCardPaymentEnabled(settings: SiteSettings): boolean {
  return getPaytrConfig(settings) !== null;
}

export function getHomepageMode(settings: SiteSettings): HomepageMode {
  return settings.theme?.homepageMode === "blocks" ? "blocks" : "mirror";
}

export async function getStoreHomepageMode(siteId?: string): Promise<HomepageMode> {
  const settings = await getSiteSettings(siteId);
  return getHomepageMode(settings);
}

export async function getStoreNavigation(siteId?: string) {
  const settings = await getSiteSettings(siteId);
  const items = getStoreNavItems(settings);
  return items.length > 0 ? items : DEFAULT_STORE_NAV;
}

export function getDefaultProductExploreLooks(settings: SiteSettings): ProductExploreLook[] {
  const fromSettings = settings.theme?.defaultProductExploreLooks;
  if (fromSettings?.length) return fromSettings;
  return loadMirrorProductExploreLooks("creamy-foundation-for-all-skin-types");
}

export function getDefaultProductMarqueeHtml(settings: SiteSettings): string {
  return getProductPageBottomSettings(settings).marquee.html;
}

export { getProductPageBottomSettings };

export async function resolveProductExploreLooks(
  siteId: string,
  productExploreLooksJson: string | null,
): Promise<ProductExploreLook[]> {
  const custom = parseExploreLooksJson(productExploreLooksJson);
  if (custom?.length) return custom;
  const settings = await getSiteSettings(siteId);
  return getDefaultProductExploreLooks(settings);
}

export async function getStoreFooter(siteId?: string): Promise<StoreFooterConfig> {
  const settings = await getSiteSettings(siteId);
  return getStoreFooterConfig(settings);
}

export { DEFAULT_STORE_NAV, getStoreNavItems, DEFAULT_STORE_FOOTER, getStoreFooterConfig };
