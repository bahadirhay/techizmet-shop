export type BingRecommendationStatus = "pass" | "warn" | "fail";

export type BingRecommendation = {
  id: "indexnow" | "meta-descriptions" | "backlinks" | "bing-verification" | "sitemap";
  title: string;
  status: BingRecommendationStatus;
  detail: string;
  bingLabel?: string;
};

export type BingMetaShortRow = {
  kind: "page" | "product";
  id: string;
  title: string;
  path: string;
  length: number;
  adminUrl: string;
};

export type BingWebmasterScan = {
  scannedAt: string;
  siteUrl: string;
  recommendations: BingRecommendation[];
  indexNow: {
    key: string;
    keyFileUrl: string;
    keyFileOk: boolean;
    lastIndexNowAt: string | null;
    lastSitemapPingAt: string | null;
    automated: boolean;
  };
  bingVerification: {
    configured: boolean;
    value: string;
  };
  metaDescriptions: {
    minRecommended: number;
    shortPages: number;
    shortProducts: number;
    totalShort: number;
    examples: BingMetaShortRow[];
  };
  backlinks: {
    detail: string;
    externalUrl: string;
  };
  urls: {
    sitemap: string;
    bingWebmaster: string;
    indexNowKey: string;
    bingSiteAuth: string;
  };
  aiEnabled: boolean;
};
