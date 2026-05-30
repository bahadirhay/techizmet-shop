export type ProductSeoInsight = {
  source: "google" | "site" | "marketplace" | "analysis" | "ai";
  label: string;
  detail: string;
};

export type ProductSeoOptimizeResult = {
  suggestedTitle: string;
  suggestedSlug: string;
  seoTitle: string;
  seoDescription: string;
  /** Kısa vitrin açıklaması */
  suggestedDescription?: string;
  suggestedDescriptionHtml?: string;
  suggestedKeyFeaturesHtml?: string;
  keywords: string[];
  score: number;
  insights: ProductSeoInsight[];
  competitorTitles?: { trendyol: string[]; hepsiburada: string[] };
  ai?: { used: boolean; provider?: string; message: string };
};

export type ProductSeoOptimizeInput = {
  title: string;
  slug?: string;
  description?: string;
  categoryIds: string[];
  brandId?: string;
  productId?: string;
};
