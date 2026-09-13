import type { CookieConsentConfig } from "@/lib/cookie-consent/types";

export const DEFAULT_COOKIE_POLICY_VERSION = "2026-09";
export const DEFAULT_COOKIE_RETENTION_DAYS = 730;
export const DEFAULT_COOKIE_RECONSENT_DAYS = 365;

const DEFAULT_PERSONAL_DATA_ITEMS = [
  "Kullanılan Tarayıcı ve İşletim Sistemi: Tarayıcı ve işletim sistemi bilgileri kaydedilir.",
  "IP Adresi: Kullanıcının IP adresi kaydedilir.",
  "Kullanıcı ID: Benzersiz bir kullanıcı kimliği oluşturulur.",
  "Ziyaret Tarihi ve Saati: Kullanıcının siteye erişim tarihi ve saati kaydedilir.",
  "Etkileşim Durumu: Siteye erişim durumu ve hata uyarıları kaydedilir.",
  "Sitedeki Özelliklerin Kullanımı: Kullanıcıların site içindeki etkileşimleri ve özellikleri kullanımları takip edilir.",
  "Arama İfadeleri: Girilen arama ifadeleri kaydedilir.",
  "Site Ziyaret Sıklığı: Kullanıcının siteyi ne sıklıkta ziyaret ettiği takip edilir.",
  "Dil Tercihleri: Kullanıcı tercihleri ve dil ayarları kaydedilir.",
  "Sayfa Kaydırma Hareketleri: Sayfalar arasındaki kaydırma hareketleri takip edilir.",
  "Erişilen Sekmeler: Hangi sekmelere erişildiği kaydedilir.",
];

const FUNCTIONAL_DETAIL =
  "Zorunlu çerezler; sitenin güvenli şekilde çalışması, oturumun korunması, tercihlerinizi (ör. dil) hatırlamamız için gereklidir.";

export function defaultCookieConsentConfig(): CookieConsentConfig {
  return {
    enabled: true,
    title: "Çerez kullanıyoruz",
    body: "Deneyiminizi iyileştirmek için çerez kullanıyoruz.",
    policyHref: "/pages/faq",
    acceptLabel: "Kabul et",
    rejectLabel: "Reddet",
    settingsLabel: "Ayarlar",
    saveSettingsLabel: "Ayarları Kaydet",
    personalDataNoticeTitle: "Çerezler aracılığıyla kişisel veriler şu şekilde toplanır:",
    personalDataNoticeItems: DEFAULT_PERSONAL_DATA_ITEMS,
    policyVersion: DEFAULT_COOKIE_POLICY_VERSION,
    retentionDays: DEFAULT_COOKIE_RETENTION_DAYS,
    reconsentDays: DEFAULT_COOKIE_RECONSENT_DAYS,
    categories: [
      {
        id: "functional",
        label: "Fonksiyonel",
        summary: "Her zaman aktif.",
        detail: FUNCTIONAL_DETAIL,
        required: true,
      },
      {
        id: "analytics",
        label: "İstatistik",
        summary: "Anonim analiz çerezleri.",
        detail:
          "Ziyaretçi sayıları ve sayfa görüntülemeleri anonim veya toplu halde analiz için kullanılır.",
        defaultEnabled: true,
      },
      {
        id: "marketing",
        label: "Pazarlama",
        summary: "Reklam ve pazarlama çerezleri.",
        detail: "İlgi alanlarınıza uygun içerik ve reklamlar için kullanılabilir.",
        defaultEnabled: true,
      },
    ],
  };
}

export function parseCookieConsentConfig(raw: string | null | undefined): CookieConsentConfig {
  const defaults = defaultCookieConsentConfig();
  if (!raw?.trim()) return defaults;
  try {
    const parsed = JSON.parse(raw) as CookieConsentConfig;
    return {
      ...defaults,
      ...parsed,
      policyVersion: String(parsed.policyVersion || defaults.policyVersion).trim() || defaults.policyVersion,
      retentionDays: normalizeDays(parsed.retentionDays, defaults.retentionDays!),
      reconsentDays: normalizeDays(parsed.reconsentDays, defaults.reconsentDays!, true),
      categories: parsed.categories?.length ? parsed.categories : defaults.categories,
      personalDataNoticeItems: parsed.personalDataNoticeItems?.length
        ? parsed.personalDataNoticeItems
        : defaults.personalDataNoticeItems,
    };
  } catch {
    return { ...defaults, enabled: false };
  }
}

function normalizeDays(value: unknown, fallback: number, allowZero = false): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (allowZero && n === 0) return 0;
  if (n < 1) return fallback;
  return Math.min(Math.floor(n), 3650);
}

export function mergeCookieConsentConfigPatch(
  currentRaw: string | null | undefined,
  patch: Partial<CookieConsentConfig>,
): string {
  const current = parseCookieConsentConfig(currentRaw);
  const next: CookieConsentConfig = {
    ...current,
    ...patch,
    policyVersion:
      patch.policyVersion !== undefined
        ? String(patch.policyVersion).trim() || DEFAULT_COOKIE_POLICY_VERSION
        : current.policyVersion,
    retentionDays:
      patch.retentionDays !== undefined
        ? normalizeDays(patch.retentionDays, DEFAULT_COOKIE_RETENTION_DAYS)
        : current.retentionDays,
    reconsentDays:
      patch.reconsentDays !== undefined
        ? normalizeDays(patch.reconsentDays, DEFAULT_COOKIE_RECONSENT_DAYS, true)
        : current.reconsentDays,
  };
  return JSON.stringify(next, null, 2);
}
