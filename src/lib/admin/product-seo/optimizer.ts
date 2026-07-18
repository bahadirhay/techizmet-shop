import "server-only";

import { slugify } from "@/lib/admin/slug";
import { aiSeoAvailableFromConfig, generateAiSeoCopy } from "@/lib/admin/product-seo/ai-copy";
import { getSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import {
  buildProductSeoDescription,
  buildProductSeoTitle,
  buildProfessionalPetProductDescription,
  ensurePrimaryPhrasesInDescription,
  isPetFoodContext,
  normalizeProductTitle,
} from "@/lib/admin/product-seo/content-builders";
import { collectKeywordSuggestions } from "@/lib/admin/product-seo/google-suggest";
import {
  fetchMarketplaceCompetitorTitles,
} from "@/lib/admin/product-seo/marketplace-search";
import {
  filterRelevantCompetitorTitles,
  safeRefineTitleFromCompetitors,
  sanitizeKeywordsForProduct,
} from "@/lib/admin/product-seo/title-integrity";
import { fetchPetNutritionFromWeb, formatNutritionLines } from "@/lib/admin/product-seo/nutrition-search";
import { suggestProductHighlights } from "@/lib/admin/product-seo/product-highlights-suggest";
import type { ProductSeoInsight, ProductSeoOptimizeInput, ProductSeoOptimizeResult } from "@/lib/admin/product-seo/types";
import { scoreLabel, scoreSeoPackage } from "@/lib/admin/product-seo/score-package";
import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";
import {
  MARKETPLACE_TITLE_RULES,
  buildAllPlatformListingTitles,
  buildCanonicalProductTitle,
} from "@/lib/marketplace/title-rules";
import { listCategoryMappings } from "@/lib/marketplace/category-mapping";
import { plainToDescriptionHtml } from "@/lib/product-content-format";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, getSiteSeo } from "@/lib/site-settings";

export type { ProductSeoInsight, ProductSeoOptimizeInput, ProductSeoOptimizeResult } from "@/lib/admin/product-seo/types";

function extractTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function finalizeMetaTitle(candidate: string, productTitle: string, brandTitle: string | undefined, siteName: string): string {
  const t = candidate.trim();
  if (t.length >= 25 && t.length <= 65) {
    return t.length <= 60 ? t : buildProductSeoTitle(productTitle, brandTitle, siteName);
  }
  return buildProductSeoTitle(productTitle, brandTitle, siteName);
}

function finalizeMetaDescription(
  candidate: string,
  opts: {
    productTitle: string;
    categoryTitles: string[];
    brandTitle?: string;
    description?: string;
    keywords: string[];
    siteName: string;
  },
): string {
  const t = candidate.trim();
  if (t.length >= 70 && t.length <= 165) {
    return t.length <= 160 ? t : buildProductSeoDescription(opts);
  }
  return buildProductSeoDescription(opts);
}

export async function optimizeProductSeo(
  siteId: string,
  input: ProductSeoOptimizeInput,
): Promise<ProductSeoOptimizeResult> {
  const insights: ProductSeoInsight[] = [];
  const title = normalizeProductTitle(input.title);
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
  const relevantCompetitorTitles = filterRelevantCompetitorTitles(title, allCompetitorTitles);

  if (relevantCompetitorTitles.length < allCompetitorTitles.length && allCompetitorTitles.length) {
    insights.push({
      source: "analysis",
      label: "Rakip başlık filtresi",
      detail: `${allCompetitorTitles.length - relevantCompetitorTitles.length} alakasız pazaryeri başlığı ürün adına karıştırılmadı (farklı içerik/tür).`,
    });
  }

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

  const keywords = sanitizeKeywordsForProduct(
    title,
    [...new Set([...googleKeywords, ...extractTokens(title), ...extractTokens(categoryTitles.join(" "))])],
  );

  const suggestedTitle = buildCanonicalProductTitle(title, brandTitle, {
    categoryTitles,
    keywords,
    weightGrams: input.weightGrams,
    pieceCount: input.pieceCount,
  });
  const marketplaceListingTitle =
    relevantCompetitorTitles.length > 0
      ? safeRefineTitleFromCompetitors(suggestedTitle, relevantCompetitorTitles, 100)
      : suggestedTitle;
  const marketplaceTitles = buildAllPlatformListingTitles(marketplaceListingTitle, brandTitle, {
    categoryTitles,
    keywords,
    weightGrams: input.weightGrams,
    pieceCount: input.pieceCount,
  });
  const suggestedSlug = input.slug?.trim() ? slugify(input.slug) : slugify(suggestedTitle);
  let seoTitle = buildProductSeoTitle(title, brandTitle, siteName);
  let seoDescription = buildProductSeoDescription({
    productTitle: suggestedTitle,
    categoryTitles,
    brandTitle,
    description: input.description,
    keywords,
    siteName,
  });

  const petFood = isPetFoodContext(suggestedTitle, categoryTitles);
  let nutritionResult = petFood
    ? await fetchPetNutritionFromWeb({
        title: suggestedTitle,
        categoryTitle: categoryTitles[0],
        brandTitle,
        categoryTitles,
      })
    : { nutrition: { source: "none" as const }, notes: [] as string[] };

  for (const note of nutritionResult.notes) {
    insights.push({
      source: "google",
      label: "Besin değerleri",
      detail: note,
    });
  }

  if (petFood && nutritionResult.nutrition.source !== "none") {
    const lines = formatNutritionLines(nutritionResult.nutrition);
    if (lines.length) {
      insights.push({
        source: "analysis",
        label: "Analitik bileşenler",
        detail: lines.map((l) => l.trim()).join(" · "),
      });
    }
  }

  const suggestedHighlights = suggestProductHighlights({
    title: suggestedTitle,
    categoryTitles,
    brandTitle,
    isPetFood: petFood,
  });

  insights.push({
    source: "analysis",
    label: "İkon şeridi",
    detail: suggestedHighlights.map((h) => h.label).filter(Boolean).join(" · "),
  });

  const aiCopy = await generateAiSeoCopy(
    {
      title: suggestedTitle,
      categoryTitles,
      brandTitle,
      keywords,
      competitorTitles: relevantCompetitorTitles,
      siteName,
      existingDescription: input.description,
      nutrition: nutritionResult.nutrition,
    },
    aiConfig,
  );

  let suggestedDescription = aiCopy.description?.trim() || "";
  let suggestedDescriptionHtml = aiCopy.descriptionHtml;
  let suggestedKeyFeaturesHtml = aiCopy.keyFeaturesHtml;
  let suggestedHowToUseHtml = aiCopy.howToUseHtml;

  if (petFood) {
    const before = suggestedDescription;
    if (suggestedDescription.length < 280) {
      suggestedDescription = buildProfessionalPetProductDescription({
        productTitle: suggestedTitle,
        brandTitle,
        categoryTitles,
        siteName,
      });
    }
    suggestedDescription = ensurePrimaryPhrasesInDescription(suggestedDescription, siteName);
    if (suggestedDescription !== before || !suggestedDescriptionHtml?.trim()) {
      suggestedDescriptionHtml = plainToDescriptionHtml(suggestedDescription);
    }
  }

  seoTitle = finalizeMetaTitle(aiCopy.seoTitle?.trim() || seoTitle, title, brandTitle, siteName);
  seoDescription = finalizeMetaDescription(aiCopy.seoDescription?.trim() || seoDescription, {
    productTitle: suggestedTitle,
    categoryTitles,
    brandTitle,
    description: suggestedDescription || input.description,
    keywords,
    siteName,
  });

  insights.push({
    source: "ai",
    label: aiCopy.used ? "AI açıklama üretildi" : "Şablon açıklama",
    detail: aiCopy.message,
  });

  const { score, parts: scoreBreakdown } = scoreSeoPackage({
    suggestedTitle,
    seoTitle,
    seoDescription,
    suggestedSlug,
    description: suggestedDescription,
    descriptionHtml: suggestedDescriptionHtml,
    keyFeaturesHtml: suggestedKeyFeaturesHtml,
    howToUseHtml: suggestedHowToUseHtml,
    highlightsCount: suggestedHighlights.filter((h) => h.label).length,
    keywords,
    categoryTitles,
    brandTitle,
    marketplaceTitles,
  });

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

  const gaps = scoreBreakdown.filter((p) => p.points < p.max);
  insights.push({
    source: "analysis",
    label: "SEO skoru",
    detail:
      gaps.length === 0
        ? `${score}/100 — ${scoreLabel(score)}`
        : `${score}/100 — ${scoreLabel(score)}. Eksik: ${gaps
            .map((g) => `${g.label} (${g.points}/${g.max})`)
            .join(" · ")}`,
  });

  return {
    suggestedTitle,
    marketplaceTitles,
    suggestedSlug,
    seoTitle,
    seoDescription,
    suggestedDescription,
    suggestedDescriptionHtml,
    suggestedKeyFeaturesHtml,
    suggestedHowToUseHtml,
    suggestedHighlights,
    keywords,
    score,
    scoreBreakdown,
    insights,
    competitorTitles: competitors,
    ai: {
      used: aiCopy.used,
      provider: aiCopy.provider,
      message: aiCopy.message,
    },
  };
}
