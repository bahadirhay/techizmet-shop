export type DistributionCheckStatus = "pending" | "done" | "skipped" | "auto";

export type DistributionChecklistItem = {
  status: DistributionCheckStatus;
  doneAt?: string;
  notes?: string;
};

export type SiteDistributionSettings = {
  /** IndexNow API anahtarı (UUID) */
  indexNowKey?: string;
  /** Platform bazlı ilerleme */
  checklist?: Record<string, DistributionChecklistItem>;
  lastSitemapPingAt?: string;
  lastIndexNowAt?: string;
  lastFullIndexAt?: string;
};

export type DistributionPlatform = {
  id: string;
  category: "search" | "news" | "blog" | "social" | "directory";
  label: string;
  description: string;
  /** Otomatik çalıştırılabilir mi */
  automated?: boolean;
  /** Harici kayıt / doğrulama linki */
  actionUrl?: string;
  /** Yardım metni */
  steps?: string[];
};

export type DistributionRunResult = {
  ok: boolean;
  indexNowKey?: string;
  keyFileUrl?: string;
  sitemapPing?: { bing?: { ok: boolean; status?: number; error?: string } };
  indexNow?: {
    ok: boolean;
    submitted: number;
    batches: number;
    error?: string;
  };
  feedUrl?: string;
  sitemapUrl?: string;
  errors: string[];
};
