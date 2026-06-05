import "server-only";

import { slugify } from "@/lib/admin/slug";
import { aiSeoAvailableFromConfig, generateAiSeoCopy } from "@/lib/admin/product-seo/ai-copy";
import { getSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { collectKeywordSuggestions } from "@/lib/admin/product-seo/google-suggest";
import {
  fetchMarketplaceCompetitorTitles,
  refineTitleFromCompetitors,
} from "@/lib/admin/product-seo/marketplace-search";
import type { ProductSeoInsight, ProductSeoOptimizeInput, ProductSeoOptimizeResult } from "@/lib/admin/product-seo/types";
import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";
import {
  MARKETPLACE_TITLE_RULES,
  buildAllPlatformListingTitles,
  buildCanonicalProductTitle,
} from "@/lib/marketplace/title-rules";
import { listCategoryMappings } from "@/lib/marketplace/category-mapping";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, getSiteSeo } from "@/lib/site-settings";

export type { ProductSeoInsight, ProductSeoOptimizeInput, ProductSeoOptimizeResult } from "@/lib/admin/product-seo/types";

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

function normalizeTitle(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function containsWord(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(haystack);
}

function extractTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreTitle(title: string, keywords: string[], categoryTitles: string[]): number {
  let score = 50;
  const len = title.length;
  if (len >= 40 && len <= 100) score += 15;
  else if (len >= 25 && len <= 120) score += 8;
  else score -= 10;

  for (const kw of keywords.slice(0, 5)) {
    if (title.toLowerCase().includes(kw.toLowerCase())) score += 5;
  }
  for (const cat of categoryTitles) {
    if (containsWord(title, cat.split(/\s+/)[0] ?? "")) score += 8;
  }
  return Math.min(100, Math.max(0, score));
}

/**
 * Google / meta title — pazaryeri başlığından bağımsız.
 * Sıra: ürün adı | marka | mağaza (kategori buraya eklenmez; tekrar ve kısıt yaratır).
 */
function buildSeoTitle(
  rawProductTitle: string,
  brandTitle: string | undefined,
  siteName: string,
  maxLen = 60,
): string {
  let product = normalizeTitle(rawProductTitle);
  const brand = brandTitle?.trim();
  const site = siteName.trim();

  if (brand && product.toLowerCase().startsWith(`${brand.toLowerCase()} `)) {
    product = product.slice(brand.length).trim();
  }

  const segments: string[] = [product];
  if (brand && !containsWord(product, brand)) {
    segments.push(brand);
  }
  segments.push(site);

  const full = segments.join(" | ");
  if (full.length <= maxLen) return full;

  if (brand && !containsWord(product, brand)) {
    const productBrand = `${product} | ${brand}`;
    if (productBrand.length <= maxLen) return productBrand;
    return truncate(productBrand, maxLen).replace(/…$/, "");
  }

  return truncate(product, maxLen).replace(/…$/, "");
}

function buildSeoDescription(input: {
  productTitle: string;
  categoryTitles: string[];
  brandTitle?: string;
  description?: string;
  keywords: string[];
  siteName: string;
}): string {
  const cat = input.categoryTitles.join(", ") || "ürün";
  const brand = input.brandTitle?.trim();
  const descSnippet = (input.description ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  const kwPhrase = input.keywords
    .filter((k) => k.length > 4 && !k.includes(input.productTitle.toLowerCase()))
    .slice(0, 3)
    .join(", ");

  const parts = [
    brand ? `${brand} ${input.productTitle}` : input.productTitle,
    `${cat} kategorisinde`,
    descSnippet || `${input.siteName} güvenilir alışveriş`,
    kwPhrase ? `Anahtar kelimeler: ${kwPhrase}` : "",
    "Hızlı kargo, güvenli ödeme.",
  ].filter(Boolean);

  return truncate(parts.join(" · "), 160).replace(/…$/, "");
}

export async function optimizeProductSeo(
  siteId: string,
  input: ProductSeoOptimizeInput,
): Promise<ProductSeoOptimizeResult> {
  const insights: ProductSeoInsight[] = [];
  const title = normalizeTitle(input.title);
  if (!title) {
    return {
      suggestedTitle: "",
      suggestedSlug: "",
      seoTitle: "",
      seoDescription: "",
      keywords: [],
      score: 0,
      insights: [{ source: "analysis", label: "Eksik bilgi", detail: "Ürün adı girin." }],
    };
  }

  const site = await prisma.storeSite.findUnique({ where: { id: siteId }, select: { name: true } });
  const settings = await getSiteSettings(siteId);
  const siteName = getSiteSeo(settings, site?.name ?? "Mağaza").siteTitle;

  const categoryIds = [...new Set(input.categoryIds.filter(Boolean))];
  const categories = categoryIds.length
    ? await prisma.storeCategory.findMany({
        where: { siteId, id: { in: categoryIds } },
        select: { id: true, title: true, seoTitle: true, parentId: true },
      })
    : [];

  const categoryTitles = categories.map((c) => c.title);
  if (categories.length) {
    insights.push({
      source: "site",
      label: "Site kategorisi",
      detail: categoryTitles.join(" › "),
    });
  } else {
    insights.push({
      source: "analysis",
      label: "Kategori önerisi",
      detail: "SEO için en az bir kategori seçin.",
    });
  }

  let brandTitle: string | undefined;
  if (input.brandId) {
    const brand = await prisma.storeBrand.findFirst({
      where: { id: input.brandId, siteId },
      select: { name: true },
    });
    brandTitle = brand?.name ?? undefined;
    if (brandTitle) {
      insights.push({ source: "site", label: "Marka", detail: brandTitle });
    }
  }

  const googleKeywords = await collectKeywordSuggestions({
    title,
    categoryTitles,
    brandTitle,
  });
  if (googleKeywords.length) {
    insights.push({
      source: "google",
      label: "Google arama önerileri",
      detail: googleKeywords.slice(0, 6).join(" · "),
    });
  }

  const competitors = await fetchMarketplaceCompetitorTitles({
    siteId,
    title,
    categoryTitle: categoryTitles[0],
    brandTitle,
    categoryIds,
  });
  const allCompetitorTitles = [
    ...competitors.trendyol,
    ...competitors.hepsiburada,
    ...competitors.localStore,
  ];

  if (competitors.trendyol.length) {
    const src = competitors.diagnostics.trendyolSource;
    const label =
      src === "cache"
        ? "Trendyol (katalog önbelleği)"
        : src === "db_listings"
          ? "Trendyol (eşleşmiş ürünler)"
          : src === "live_api"
            ? "Trendyol (canlı API)"
            : "Trendyol başlıkları";
    insights.push({
      source: "marketplace",
      label,
      detail: competitors.trendyol.slice(0, 4).join(" · "),
    });
  } else if (
    competitors.diagnostics.trendyolSeller === "skipped" ||
    competitors.diagnostics.trendyolSeller === "error"
  ) {
    const detail =
      competitors.notes.find((n) => n.includes("Trendyol") || n.includes("API")) ??
      "Entegrasyonlar → Trendyol: API bilgilerini kaydedin, Bağlantıyı test et, ardından Katalog çek.";
    insights.push({
      source: "marketplace",
      label: "Trendyol",
      detail,
    });
  }

  if (competitors.hepsiburada.length) {
    insights.push({
      source: "marketplace",
      label: "Hepsiburada rakip başlıkları",
      detail: competitors.hepsiburada.slice(0, 4).join(" · "),
    });
  }

  if (competitors.localStore.length) {
    insights.push({
      source: "site",
      label: "Mağaza benzer başlıklar",
      detail: competitors.localStore.slice(0, 4).join(" · "),
    });
  }

  if (!allCompetitorTitles.length) {
    insights.push({
      source: "marketplace",
      label: "Pazaryeri araması",
      detail:
        competitors.diagnostics.trendyolSeller === "empty"
          ? "Trendyol kataloğunda eşleşen başlık yok. Katalog çek veya Google önerileri kullanılır."
          : "Rakip başlık alınamadı. Google önerileri yine kullanıldı.",
    });
  }

  const aiConfig = await getSeoAiConfig(siteId);
  const aiStatus = aiSeoAvailableFromConfig(aiConfig);
  if (aiStatus.any) {
    const labels = [
      aiStatus.gemini ? "Gemini" : null,
      aiStatus.claude ? "Claude" : null,
      aiStatus.openai ? "OpenAI" : null,
    ]
      .filter(Boolean)
      .join(", ");
    insights.push({
      source: "ai",
      label: "AI metin",
      detail: `${labels} aktif (${aiConfig.provider === "auto" ? "otomatik sıra" : aiConfig.provider}) — açıklama AI ile üretilecek`,
    });
  } else {
    insights.push({
      source: "ai",
      label: "AI metin (isteğe bağlı)",
      detail:
        "Ayarlar → SEO AI bölümünden Gemini, Claude veya OpenAI anahtarı ekleyin. Şimdilik ücretsiz şablon kullanılır.",
    });
  }

  const mappingPlatforms = await Promise.all(
    MARKETPLACE_PLATFORMS.map((p) => listCategoryMappings(siteId, p.id)),
  );
  for (let i = 0; i < MARKETPLACE_PLATFORMS.length; i++) {
    const platform = MARKETPLACE_PLATFORMS[i]!;
    const maps = mappingPlatforms[i] ?? [];
    const hit = maps.find((m) => m.categoryId && categoryIds.includes(m.categoryId));
    if (hit) {
      insights.push({
        source: "marketplace",
        label: `${platform.label} kategori eşlemesi`,
        detail: `Platform kategori ID: ${hit.platformCategoryId}${hit.platformBrandId ? ` · marka ID: ${hit.platformBrandId}` : ""}`,
      });
    }
  }

  const similar = categoryIds.length
    ? await prisma.storeProduct.findMany({
        where: {
          siteId,
          id: input.productId ? { not: input.productId } : undefined,
          OR: [
            { categoryId: { in: categoryIds } },
            { categoryLinks: { some: { categoryId: { in: categoryIds } } } },
          ],
        },
        select: { title: true, seoTitle: true, seoDescription: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      })
    : [];

  if (similar.length) {
    const avgLen = Math.round(similar.reduce((s, p) => s + p.title.length, 0) / similar.length);
    insights.push({
      source: "site",
      label: "Benzer ürünler (sitede)",
      detail: `${similar.length} ürün incelendi · ortalama başlık ${avgLen} karakter · örn. "${similar[0]!.title}"`,
    });
  }

  if (input.productId) {
    const listings = await prisma.marketplaceProductListing.findMany({
      where: { siteId, productId: input.productId },
      select: { platform: true, listingStatus: true },
    });
    for (const l of listings) {
      const pl = MARKETPLACE_PLATFORMS.find((p) => p.id === l.platform)?.label ?? l.platform;
      insights.push({
        source: "marketplace",
        label: `${pl} listeleme`,
        detail: `Durum: ${l.listingStatus}`,
      });
    }
  }

  if (title.length > 100) {
    insights.push({
      source: "marketplace",
      label: "Trendyol / HB uyarısı",
      detail: "Başlık 100 karakterden uzun — pazaryerlerinde kısaltma gerekebilir.",
    });
  }

  const keywords = [...new Set([...googleKeywords, ...extractTokens(title), ...extractTokens(categoryTitles.join(" "))])];

  let suggestedTitle = buildCanonicalProductTitle(title, brandTitle, categoryTitles, keywords);
  if (allCompetitorTitles.length) {
    suggestedTitle = refineTitleFromCompetitors(suggestedTitle, allCompetitorTitles, 100);
  }
  const marketplaceTitles = buildAllPlatformListingTitles(suggestedTitle, brandTitle, {
    categoryTitles,
    keywords,
  });
  const suggestedSlug = input.slug?.trim() ? slugify(input.slug) : slugify(suggestedTitle);
  const seoTitle = buildSeoTitle(title, brandTitle, siteName);
  let seoDescription = buildSeoDescription({
    productTitle: suggestedTitle,
    categoryTitles,
    brandTitle,
    description: input.description,
    keywords,
    siteName,
  });

  const aiCopy = await generateAiSeoCopy(
    {
      title: suggestedTitle,
      categoryTitles,
      brandTitle,
      keywords,
      competitorTitles: allCompetitorTitles,
      siteName,
      existingDescription: input.description,
    },
    aiConfig,
  );
  if (aiCopy.seoDescription) seoDescription = aiCopy.seoDescription;
  insights.push({
    source: "ai",
    label: aiCopy.used ? "AI açıklama üretildi" : "Şablon açıklama",
    detail: aiCopy.message,
  });

  const score = scoreTitle(suggestedTitle, keywords, categoryTitles);

  insights.push({
    source: "analysis",
    label: "SEO başlık yapısı",
    detail: brandTitle
      ? `Ürün adı → marka → mağaza: "${seoTitle}"`
      : `Ürün adı → mağaza (marka seçilmedi): "${seoTitle}"`,
  });

  for (const p of MARKETPLACE_PLATFORMS) {
    const rule = MARKETPLACE_TITLE_RULES[p.id];
    const mt = marketplaceTitles[p.id];
    if (!rule || !mt) continue;
    insights.push({
      source: "marketplace",
      label: `${p.label} başlığı`,
      detail: `${mt} (${mt.length}/${rule.maxLength} kar.) — ${rule.note}`,
    });
  }

  insights.push({
    source: "analysis",
    label: "Mağaza ürün adı",
    detail: `Marka öneksiz kanonik ad (Trendyol API brandId ile gider): "${suggestedTitle}"`,
  });

  insights.push({
    source: "analysis",
    label: "SEO skoru",
    detail: `${score}/100 — ${score >= 75 ? "iyi uyum" : score >= 55 ? "orta — önerileri uygulayın" : "zayıf — kategori ve anahtar kelime ekleyin"}`,
  });

  return {
    suggestedTitle,
    marketplaceTitles,
    suggestedSlug,
    seoTitle,
    seoDescription,
    suggestedDescription: aiCopy.description,
    suggestedDescriptionHtml: aiCopy.descriptionHtml,
    suggestedKeyFeaturesHtml: aiCopy.keyFeaturesHtml,
    keywords,
    score,
    insights,
    competitorTitles: competitors,
    ai: {
      used: aiCopy.used,
      provider: aiCopy.provider,
      message: aiCopy.message,
    },
  };
}
