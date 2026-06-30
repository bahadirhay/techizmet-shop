import { cache } from "react";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getSiteBranding as getSiteBrandingCore } from "@/lib/site-settings-branding";
import { getGoogleSwgSettings } from "@/lib/seo/google-swg-settings";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { getPaytrConfig } from "@/lib/payments/paytr";
import { extractUrls } from "@/lib/social-links";
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
import type { MirrorHomeConfig, MirrorPageConfig } from "@/lib/mirror-home-overlay";
import {
  getProductPageBottomSettings,
  type ProductPageBottomThemeConfig,
} from "@/lib/product-page-bottom";
import {
  isSiteDefaultExploreJson,
  parseExploreLooksJson,
  type ProductExploreLook,
} from "@/lib/product-explore-looks";
import type { AnnouncementBarSettings } from "@/lib/mirror-announcement-bar";
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

export type StoreSmtpSettings = {
  /** smtp | resend | auto (önce SMTP, yoksa Resend) */
  provider?: "smtp" | "resend" | "auto";
  host?: string;
  port?: number;
  /** true = 465 SSL; false = STARTTLS (587) */
  secure?: boolean;
  user?: string;
  password?: string;
  /** false = self-signed sertifikaya izin (geliştirme) */
  tlsRejectUnauthorized?: boolean;
  /** Resend alternatifi — SMTP yoksa veya provider=resend */
  resendApiKey?: string;
};

export type StoreNotificationSettings = {
  email?: StoreEmailNotificationSettings;
  smtp?: StoreSmtpSettings;
  sms?: StoreSmsNotificationSettings;
  telegram?: StoreTelegramNotificationSettings;
};

/** Ana sayfa vitrin tipi */
export type HomepageMode = "mirror" | "blocks";

export type { SiteMaintenanceSettings } from "@/lib/maintenance-mode";

export type CronRunRecord = import("@/lib/cron-health").CronRunRecord;

export type SiteOpsSettings = {
  cron?: Partial<Record<import("@/lib/cron-health").CronJobId, CronRunRecord>>;
  /** GSC arama sorguları önbelleği (son senkron) */
  gsc?: import("@/lib/admin/gsc/sync").GscSyncCache;
};

export type SiteSettings = {
  /** Cron sağlık kayıtları, operasyonel meta */
  ops?: SiteOpsSettings;
  /** Mağaza bakım modu — açıkken ziyaretçiler bakım sayfasına yönlendirilir */
  maintenance?: import("@/lib/maintenance-mode").SiteMaintenanceSettings;
  /** Google / Apple ile giriş — yalnızca clientId; gizli anahtarlar .env */
  customerAuth?: {
    googleEnabled?: boolean;
    appleEnabled?: boolean;
    googleClientId?: string;
    appleClientId?: string;
  };
  theme?: {
    /** mirror = HTTrack Techizmet Shop HTML, blocks = admin DnD sayfa (home) */
    homepageMode?: HomepageMode;
    /** Vitrin üst menü (mirror + blok modunda) */
    navItems?: StoreNavItem[];
    /** Vitrin alt bilgi / footer menüleri */
    footer?: StoreFooterConfig;
    /** Mağaza varsayılanı EXPLORE (yalnızca ürün exploreLooksJson sentinel iken) */
    defaultProductExploreLooks?: ProductExploreLook[];
    /** Ürün PDP kayan kampanya şeridi — geriye dönük */
    defaultProductMarqueeHtml?: string;
    /** Ürün PDP alt bölümler: marquee, revealing text, video metin */
    defaultProductPageBottom?: ProductPageBottomThemeConfig;
    /** Header duyuru şeridi (üst kayan yazılar) */
    announcementBar?: AnnouncementBarSettings;
    /** mirror index → admin home blok içe aktarma sürümü */
    mirrorHomeImportVersion?: number;
    /** Techizmet Shop ana sayfa — bölüm sırası / gizle / başlık */
    mirrorHome?: MirrorHomeConfig;
    /** Tüm vitrin sayfaları (home, collections, …) */
    mirrorPages?: Partial<Record<string, MirrorPageConfig>>;
    mirrorPagesMeta?: Partial<Record<string, { published?: boolean }>>;
  };
  email?: {
    templates?: Partial<Record<EmailTemplateKey, EmailTemplate>>;
  };
  /** Bildirim kanalları — site başına (DB settingsJson); .env yalnızca API anahtarı */
  notifications?: StoreNotificationSettings;
  /** Ön muhasebe — kâr tahmini ve sipariş ekonomisi */
  finance?: {
    /** Tahmini PayTR / kart komisyonu (%) */
    cardFeePercent?: number;
    /** Web siparişlerinde sizin ödediğiniz kargo maliyeti (kuruş) — müşteri ücretsiz kargo alsın bile */
    webShippingCostMinor?: number;
    /** Sipariş başı paketleme / malzeme gideri (kuruş) */
    packagingCostMinor?: number;
    /** Vergi / beyanname yapılandırması (şahıs şirketi) */
    tax?: {
      /** Mükellefiyet başlangıç tarihi (YYYY-MM-DD) */
      openingDate?: string;
      /** Vergi Kimlik Numarası (VKN) */
      vkn?: string;
      /** Vergi dairesi adı */
      vergiDairesi?: string;
      /** NACE / faaliyet kodu */
      faaliyetKodu?: string;
      /** Gelir vergisi dilimleri — artan oranlı tarife (GVK 103) */
      incomeBrackets?: { upTo: number | null; rate: number }[];
      /** Beyanname başına damga vergisi (TL) */
      stampDuty?: { kdv?: number; muhtasar?: number; gecici?: number; yillikGelir?: number };
      /** Muhtasar dönemi: aylık (12) veya 3 aylık (4) */
      muhtasarPeriod?: "monthly" | "quarterly";
    };
    /** Google Sheets / harici entegrasyon için webhook token */
    webhookToken?: string;
  };
  payment?: {
    paytr?: { merchantId?: string; merchantKey?: string; merchantSalt?: string; testMode?: boolean };
    iyzico?: { apiKey?: string; secretKey?: string; baseUrl?: string };
    codEnabled?: boolean;
    bankTransferEnabled?: boolean;
    bankAccounts?: { bank: string; iban: string; holder: string }[];
  };
  store?: {
    freeShippingOverMinor?: number;
    /** USD/TRY piyasa kuruna eklenen üst marjı (%) — örn. 5 = %5 fazla */
    usdMarkupPercent?: number;
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
    /** Mesafeli satış sözleşmesi — satıcı bilgileri */
    legal?: {
      tradeName?: string;
      address?: string;
      phone?: string;
      email?: string;
      mersisNo?: string;
      taxOffice?: string;
      taxNo?: string;
      website?: string;
      caymaEmail?: string;
      arbitrationInfo?: string;
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
    yandexVerification?: string;
    bingVerification?: string;
    /** Pinterest işletme — p:domain_verify meta içeriği */
    pinterestDomainVerify?: string;
    /** schema.org Organization adı */
    organizationName?: string;
    /** schema.org Organization sameAs — resmi sosyal/profil URL'leri (varlık otoritesi, GEO) */
    organizationSameAs?: string[];
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    robotsIndex?: boolean;
    extraHeadHtml?: string;
    /** Google Haberler — Subscribe with Google Basic (blog sayfaları) */
    googleSwg?: import("@/lib/seo/google-swg-settings").GoogleSwgSettings;
    /** Google Müşteri Yorumları — sipariş onayı sayfasına enjekte edilen opt-in widget */
    googleCustomerReviews?: {
      merchantId?: string;
      /** Tahmini teslimat süresi (gün) — estimated_delivery_date hesabında kullanılır */
      deliveryDays?: number;
    };
    /** Koleksiyon listesi, blog listesi vb. sabit sayfa meta */
    staticPages?: Record<
      string,
      { seoTitle?: string; seoDescription?: string; imageAlt?: string; imageUrl?: string }
    >;
    /** Hedef Aramalar — intent başına uygulanan landing meta (tarama doğruluğu) */
    searchIntentMeta?: Record<
      string,
      { seoTitle?: string; seoDescription?: string; appliedAt?: string }
    >;
    /** Arama motoru / dizin dağıtım durumu */
    distribution?: import("@/lib/seo/distribution-types").SiteDistributionSettings;
  };
  /** Statik sayfa özel ayarları */
  pages?: {
    contact?: {
      /** Google Maps embed URL (iframe src) */
      mapEmbedUrl?: string;
      /** Harita konumu: left=sol (varsayılan), top=üst tam genişlik, bottom=alt tam genişlik, hidden=gizli */
      mapPosition?: "left" | "top" | "bottom" | "hidden";
    };
  };
  /** KVKK çerez banner — JSON (web-page ile uyumlu) */
  cookieConsentJson?: string | null;
  /** GİB e-Arşiv portal — ücretsiz fatura kesimi */
  efatura?: StoreEfaturaSettings;
  /** Ürün SEO AI — Gemini, OpenAI, Claude */
  seoAi?: StoreSeoAiSettings;
  /** Blog otomasyon — arama kelimelerinden taslak/yayın */
  blogAutomation?: import("@/lib/admin/blog-automation/settings").BlogAutomationSettings;
  /** Google Search Console — organik arama sorguları */
  gsc?: import("@/lib/admin/gsc/settings").GscSettings;
  /** Google Merchant Center ürün feed */
  googleMerchant?: import("@/lib/seo/google-merchant-types").GoogleMerchantSettings;
  /** WhatsApp gelen kutusu, bot, takip */
  whatsapp?: import("@/lib/whatsapp-settings").StoreWhatsAppSettings;
  /** AI işletme asistanı — bilgi tabanı, kanallar, handoff */
  assistant?: import("@/lib/assistant/settings").StoreAssistantSettings;
  /** Geliver kargo pazaryeri */
  geliver?: import("@/lib/shipping/geliver/types").GeliverSiteSettings;
  /** Sokak dostları mama fonu */
  streetFoodFund?: import("@/lib/street-food-fund/types").StreetFoodFundSettings;
  /** Sosyal medya otomatik yayın — Meta, TikTok, YouTube, LinkedIn */
  socialPublish?: StoreSocialPublishSettings;
};

export type StoreSocialPublishSettings = {
  meta?: {
    enabled?: boolean;
    /** Uzun ömürlü sayfa erişim jetonu */
    accessToken?: string;
    /** Facebook Sayfa ID */
    pageId?: string;
    /** Instagram Business hesap ID (IG User ID) */
    instagramAccountId?: string;
  };
  tiktok?: {
    enabled?: boolean;
    clientKey?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    openId?: string;
  };
  youtube?: {
    enabled?: boolean;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    /** OAuth ile alınan kanal ID */
    channelId?: string;
  };
  linkedin?: {
    enabled?: boolean;
    accessToken?: string;
    /** urn:li:organization:123 veya urn:li:person:123 */
    authorUrn?: string;
  };
};

export type SeoAiProvider = "auto" | "gemini" | "openai" | "claude";

/** Blog kapak görseli sağlayıcısı */
export type ImageAiProvider = "auto" | "fal" | "openai";

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
  /** fal.ai — blog görsel üretimi (https://fal.ai/dashboard/keys) */
  falApiKey?: string;
  /** örn. fal-ai/flux/schnell, fal-ai/flux/dev */
  falImageModel?: string;
  /** auto = fal varsa önce fal, sonra OpenAI DALL·E */
  imageProvider?: ImageAiProvider;
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
  /** Sipariş "shipped" statüsüne geçince otomatik fatura kes */
  autoInvoiceOnShip?: boolean;
};

/** Admin form — DB'deki ham değerler (boş alanlarda vitrin fallback) */
export function getEditableBranding(settings: SiteSettings) {
  const b = settings.branding ?? {};
  const resolved = getSiteBrandingCore(settings);
  return {
    logoUrl: b.logoUrl?.trim() || resolved.logoUrl,
    logoUrlLight: b.logoUrlLight?.trim() || resolved.logoUrlLight,
    faviconUrl: b.faviconUrl?.trim() || resolved.faviconUrl,
  };
}

export { getSiteBrandingCore as getSiteBranding };

export function getSiteSeo(settings: SiteSettings, siteName: string) {
  const s = settings.seo ?? {};
  return {
    siteTitle: s.siteTitle?.trim() || siteName,
    metaDescription: s.metaDescription?.trim() || "E-ticaret vitrin",
    metaKeywords: s.metaKeywords?.trim() || "",
    ogImageUrl: s.ogImageUrl?.trim() || "",
    googleSiteVerification: s.googleSiteVerification?.trim() || "",
    yandexVerification: s.yandexVerification?.trim() || "",
    bingVerification: s.bingVerification?.trim() || "",
    pinterestDomainVerify: s.pinterestDomainVerify?.trim() || "",
    organizationName: s.organizationName?.trim() || "",
    organizationSameAs: extractUrls(s.organizationSameAs),
    googleAnalyticsId: s.googleAnalyticsId?.trim() || "",
    facebookPixelId: s.facebookPixelId?.trim() || "",
    robotsIndex: s.robotsIndex !== false,
    extraHeadHtml: s.extraHeadHtml?.trim() || "",
    googleSwg: getGoogleSwgSettings(settings),
    staticPages: s.staticPages ?? {},
    googleCustomerReviews: s.googleCustomerReviews ?? {},
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

export const getSiteSettings = cache(async (siteId?: string): Promise<SiteSettings> => {
  const id = siteId ?? (await getDefaultSite()).id;
  return getCachedParsedSiteSettings(id);
});

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
  if (fromSettings !== undefined) return fromSettings;
  return [];
}

export function getDefaultProductMarqueeHtml(settings: SiteSettings): string {
  return getProductPageBottomSettings(settings).marquee.html;
}

export { getProductPageBottomSettings };

export async function resolveProductExploreLooks(
  siteId: string,
  productExploreLooksJson: string | null,
): Promise<ProductExploreLook[]> {
  if (isSiteDefaultExploreJson(productExploreLooksJson)) {
    const settings = await getSiteSettings(siteId);
    return getDefaultProductExploreLooks(settings);
  }
  const custom = parseExploreLooksJson(productExploreLooksJson);
  if (custom !== null) return custom;
  return [];
}

export async function getStoreFooter(siteId?: string): Promise<StoreFooterConfig> {
  const settings = await getSiteSettings(siteId);
  return getStoreFooterConfig(settings);
}

export { DEFAULT_STORE_NAV, getStoreNavItems, DEFAULT_STORE_FOOTER, getStoreFooterConfig };
