export type SiteSeoPageKind =
  | "home"
  | "collections"
  | "collection"
  | "category"
  | "cms"
  | "blog-list"
  | "blog-post";

export type SiteSeoHealthStatus = "ok" | "warn" | "fail";

export type SiteSeoAuditItem = {
  id: string;
  label: string;
  status: SiteSeoHealthStatus;
  detail: string;
};

export type SiteSeoPageRecord = {
  id: string;
  kind: SiteSeoPageKind;
  path: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  imageUrl: string | null;
  imageAlt: string | null;
  entityId?: string;
  entityTable?: "shopPage" | "blogPost" | "storeCollection" | "storeCategory" | "site";
  published: boolean;
};

export type SiteSeoAuditResult = {
  scannedAt: string;
  siteName: string;
  siteUrl: string;
  summary: { ok: number; warn: number; fail: number; total: number };
  pages: Array<SiteSeoPageRecord & { score: number; items: SiteSeoAuditItem[] }>;
};

export type SiteSeoOptimizeResult = {
  updated: number;
  pages: Array<{
    path: string;
    seoTitle: string;
    seoDescription: string;
    imageAlt?: string | null;
  }>;
};
