/** KVKK / denetim amaçlı çerez rıza kaydı — iletişim listesi değildir. */

export type CookieConsentDecision = "accepted" | "rejected" | "custom" | "withdrawn";

export type CookieConsentSource = "banner" | "settings" | "reconsent" | "withdrawn";

export type CookieConsentPreferences = Record<string, boolean>;

export type CookieConsentCategory = {
  id: string;
  label: string;
  summary?: string;
  detail?: string;
  description?: string;
  required?: boolean;
  defaultEnabled?: boolean;
};

/**
 * cookieConsentJson şeması.
 * policyVersion değişince ziyaretçiden yeniden onay istenir.
 */
export type CookieConsentConfig = {
  enabled?: boolean;
  title?: string;
  body?: string;
  policyHref?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  settingsLabel?: string;
  saveSettingsLabel?: string;
  categories?: CookieConsentCategory[];
  personalDataNoticeTitle?: string;
  personalDataNoticeItems?: string[];
  /**
   * Aydınlatma / banner metin sürümü (örn. 2026-09).
   * Değişince mevcut onay geçersiz sayılır ve banner yeniden açılır.
   */
  policyVersion?: string;
  /** Rıza loglarının saklama süresi (gün). Varsayılan 730 (~2 yıl). */
  retentionDays?: number;
  /** Yeniden onay sıklığı (gün). Varsayılan 365. 0 = yalnızca policyVersion değişince. */
  reconsentDays?: number;
};

export type CookieConsentStats = {
  total: number;
  accepted: number;
  rejected: number;
  custom: number;
  withdrawn: number;
  acceptRate: number;
  rejectRate: number;
  analyticsOptIn: number;
  marketingOptIn: number;
  analyticsOptInRate: number;
  marketingOptInRate: number;
  uniqueDevices: number;
  last7Days: number;
  last30Days: number;
  currentPolicyVersion: string;
  retentionDays: number;
  reconsentDays: number;
};

export type CookieConsentLogRow = {
  id: string;
  consentKey: string;
  decision: string;
  preferences: string | null;
  policyVersion: string | null;
  source: string | null;
  locale: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};
