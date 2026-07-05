export type SitePerfCheckStatus = "pass" | "warn" | "fail" | "info";

export type SitePerfCheck = {
  id: string;
  /** Lighthouse denetim kimliği */
  lighthouseId?: string;
  label: string;
  /** Ne demek, neden önemli */
  explanation: string;
  status: SitePerfCheckStatus;
  detail: string;
  fixLabel?: string;
  fixHref?: string;
  fixAction?: "revalidate-cache" | "seo-optimize" | "seo-dashboard-fix" | "perf-apply-fixes";
};

export type SitePerfPsiScore = {
  strategy: "mobile" | "desktop";
  performance: number | null;
  lcpMs: number | null;
  cls: number | null;
  fcpMs: number | null;
  error?: string;
};

export type SitePerformanceReport = {
  scannedAt: string;
  siteUrl: string;
  checks: SitePerfCheck[];
  summary: { pass: number; warn: number; fail: number; info: number };
  psi?: { mobile?: SitePerfPsiScore; desktop?: SitePerfPsiScore };
  aiEnabled: boolean;
};
