import type { ProductHighlight } from "@/lib/product-highlights";

export type ProductSeoInsight = {
  source: "google" | "site" | "marketplace" | "analysis" | "ai";
  label: string;
  detail: string;
};

export type ProductSeoOptimizeResult = {
  /** Mağaza + Trendyol title alanı (marka öneksiz) */
  suggestedTitle: string;
  /** Platforma özel listeleme başlıkları */
  marketplaceTitles?: Record<string, string>;
  suggestedSlug: string;
  seoTitle: string;
  seoDescription: string;
  /** Kısa vitrin açıklaması */
  suggestedDescription?: string;
  suggestedDescriptionHtml?: string;
  suggestedKeyFeaturesHtml?: string;
  /** Kullanım / veriliş talimatları (besin değerleri keyFeatures içinde) */
  suggestedHowToUseHtml?: string;
  /** Sepete ekle altı ikon şeridi */
  suggestedHighlights?: ProductHighlight[];
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
  /** Net ürün ağırlığı (gram) — pazaryeri başlığına gramaj olarak eklenir */
  weightGrams?: number;
  /** Paketteki adet — başlıkta belirtilmemişse "X'li Paket" eklenir */
  pieceCount?: number;
};
