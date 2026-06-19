import type { SiteSeoAuditResult } from "@/lib/admin/site-seo/types";

export type SeoDashboardProductRow = {
  id: string;
  slug: string;
  title: string;
  score: number;
  issues: string[];
  missingImageAlts: number;
  imageCount: number;
  published: boolean;
};

export type SeoDashboardScan = {
  scannedAt: string;
  siteUrl: string;
  aiEnabled: boolean;
  aiProviders: { gemini: boolean; claude: boolean; openai: boolean };
  distribution: {
    lastFullIndexAt: string | null;
    lastIndexNowAt: string | null;
    lastSitemapPingAt: string | null;
  };
  summary: {
    pages: { ok: number; warn: number; fail: number; total: number; avgScore: number };
    products: {
      total: number;
      published: number;
      weak: number;
      missingMeta: number;
      missingImageAlts: number;
      avgScore: number;
    };
  };
  pages: SiteSeoAuditResult;
  products: SeoDashboardProductRow[];
  productQueue: {
    needsSeoFix: number;
    needsImageAlts: number;
  };
};

export type SeoDashboardFixTarget = "pages" | "products" | "image-alts" | "all";

export type SeoDashboardFixResult = {
  target: SeoDashboardFixTarget;
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  errors: string[];
  details: string[];
};
