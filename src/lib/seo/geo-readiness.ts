import "server-only";

import { htmlToPlainText } from "@/lib/html-plain-text";
import { aiProductsFeedPath } from "@/lib/seo/ai-products-feed";
import { llmsTxtUrl } from "@/lib/seo/llms-builder";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteSeo } from "@/lib/site-settings";
import { getApprovedReviewCountsBySite } from "@/lib/reviews/service";
import { prisma } from "@/lib/prisma";

export type GeoCheckStatus = "pass" | "warn" | "fail";

export type GeoSiteCheck = {
  id: string;
  label: string;
  status: GeoCheckStatus;
  detail: string;
};

export type GeoProductIssue = {
  id: string;
  code: string;
  label: string;
  status: GeoCheckStatus;
};

export type GeoProductRow = {
  id: string;
  slug: string;
  title: string;
  score: number;
  issues: GeoProductIssue[];
  adminUrl: string;
};

export type GeoReadinessReport = {
  generatedAt: string;
  siteScore: number;
  siteChecks: GeoSiteCheck[];
  productSummary: {
    total: number;
    published: number;
    averageScore: number;
    readyCount: number;
    needsWorkCount: number;
  };
  products: GeoProductRow[];
  infraUrls: {
    llmsTxt: string;
    productsJson: string;
    sitemap: string;
    googleMerchant: string;
  };
};

const MIN_DESCRIPTION_CHARS = 120;

function scoreFromIssues(issues: GeoProductIssue[]): number {
  if (!issues.length) return 100;
  let score = 100;
  for (const issue of issues) {
    if (issue.status === "fail") score -= 20;
    else if (issue.status === "warn") score -= 10;
  }
  return Math.max(0, score);
}

function auditProduct(row: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  descriptionHtml: string | null;
  seoDescription: string | null;
  imageUrl: string | null;
  priceMinor: number;
  stockQty: number;
  keyFeaturesHtml: string | null;
  howToUseHtml: string | null;
  brand: { name: string } | null;
  category: { title: string } | null;
  images: { url: string }[];
}, approvedReviewCount = 0): GeoProductRow {
  const issues: GeoProductIssue[] = [];
  const plain =
    row.description?.trim() ||
    (row.descriptionHtml ? htmlToPlainText(row.descriptionHtml) : "") ||
    "";

  if (plain.length < MIN_DESCRIPTION_CHARS) {
    issues.push({
      id: `${row.id}-desc`,
      code: "description_short",
      label: `Açıklama kısa (${plain.length}/${MIN_DESCRIPTION_CHARS} karakter)`,
      status: plain.length < 40 ? "fail" : "warn",
    });
  }

  if (!row.seoDescription?.trim()) {
    issues.push({
      id: `${row.id}-seo`,
      code: "seo_description_missing",
      label: "SEO açıklaması yok",
      status: "warn",
    });
  }

  if (!row.imageUrl && !row.images.length) {
    issues.push({
      id: `${row.id}-image`,
      code: "image_missing",
      label: "Ürün görseli yok",
      status: "fail",
    });
  }

  if (!row.brand?.name?.trim()) {
    issues.push({
      id: `${row.id}-brand`,
      code: "brand_missing",
      label: "Marka atanmamış",
      status: "warn",
    });
  }

  if (!row.category?.title?.trim()) {
    issues.push({
      id: `${row.id}-category`,
      code: "category_missing",
      label: "Kategori atanmamış",
      status: "warn",
    });
  }

  if (!row.keyFeaturesHtml?.trim() && !row.howToUseHtml?.trim()) {
    issues.push({
      id: `${row.id}-facts`,
      code: "facts_missing",
      label: "Özellik veya kullanım bilgisi yok (AI için zayıf)",
      status: "warn",
    });
  }

  if (row.priceMinor <= 0) {
    issues.push({
      id: `${row.id}-price`,
      code: "price_invalid",
      label: "Geçersiz fiyat",
      status: "fail",
    });
  }

  if (approvedReviewCount <= 0) {
    issues.push({
      id: `${row.id}-reviews`,
      code: "reviews_missing",
      label: "Onaylı yorum yok (yıldız/AggregateRating çıkmaz)",
      status: "warn",
    });
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    score: scoreFromIssues(issues),
    issues,
    adminUrl: `/admin/products/${row.id}`,
  };
}

function auditSite(
  settings: SiteSettings,
  siteName: string,
  publishedWithImage: number,
  reviews: { withReviews: number; published: number },
): GeoSiteCheck[] {
  const seo = getSiteSeo(settings, siteName);
  const origin = getPublicSiteUrl();
  const checks: GeoSiteCheck[] = [];

  checks.push({
    id: "robots_index",
    label: "Arama motoru indeksleme açık",
    status: seo.robotsIndex ? "pass" : "fail",
    detail: seo.robotsIndex ? "robots.txt ürün sayfalarına izin veriyor" : "robotsIndex kapalı — site dizinlenmiyor",
  });

  checks.push({
    id: "meta_description",
    label: "Site meta açıklaması",
    status: seo.metaDescription?.trim() ? "pass" : "warn",
    detail: seo.metaDescription?.trim()
      ? "Ana site açıklaması tanımlı"
      : "Logo & SEO ayarlarında meta açıklama ekleyin",
  });

  const sameAsCount = (seo.organizationSameAs ?? []).length;
  checks.push({
    id: "organization_sameas",
    label: "Marka varlık otoritesi (Organization sameAs)",
    status: sameAsCount >= 2 ? "pass" : "warn",
    detail:
      sameAsCount > 0
        ? `${sameAsCount} resmi profil bağlandı — Google/AI markanızı tek varlık olarak tanır`
        : "Resmi sosyal/profil bağlantısı yok — Logo & SEO ayarlarında 'Resmi sosyal/profil bağlantıları' ekleyin (E-E-A-T)",
  });

  checks.push({
    id: "llms_txt",
    label: "llms.txt (AI kürasyon dosyası)",
    status: "pass",
    detail: `${origin}/llms.txt — otomatik üretiliyor`,
  });

  checks.push({
    id: "products_json",
    label: "JSON ürün kataloğu",
    status: publishedWithImage > 0 ? "pass" : "warn",
    detail: `${origin}${aiProductsFeedPath()} — ${publishedWithImage} ürün`,
  });

  checks.push({
    id: "google_merchant",
    label: "Google Merchant feed",
    status: settings.googleMerchant?.enabled !== false ? "pass" : "warn",
    detail:
      settings.googleMerchant?.enabled !== false
        ? "Feed aktif — Merchant Center'a bağlayın"
        : "Feed kapalı — Admin → Google Merchant",
  });

  const reviewHalf = Math.ceil(reviews.published * 0.5);
  checks.push({
    id: "product_reviews",
    label: "Ürün yorumları & yıldız (AggregateRating)",
    status:
      reviews.published === 0
        ? "warn"
        : reviews.withReviews === 0
          ? "fail"
          : reviews.withReviews >= reviewHalf
            ? "pass"
            : "warn",
    detail:
      reviews.published === 0
        ? "Yayında ürün yok"
        : `${reviews.withReviews}/${reviews.published} üründe onaylı yorum var — yıldızlar Google CTR'sini artırır (Admin → Ürün Yorumları)`,
  });

  checks.push({
    id: "gmc_connected",
    label: "Google Merchant Center kaydı",
    status: "warn",
    detail: "Operasyonel adım — merchants.google.com'da feed URL doğrulanmalı (kod otomatik kontrol edemez)",
  });

  checks.push({
    id: "chatgpt_merchants",
    label: "ChatGPT Shopping / merchants",
    status: "warn",
    detail: "Operasyonel adım — chatgpt.com/merchants başvurusu (Türkiye kapsamı sınırlı olabilir)",
  });

  return checks;
}

function siteScoreFromChecks(checks: GeoSiteCheck[]): number {
  if (!checks.length) return 0;
  let total = 0;
  for (const c of checks) {
    if (c.status === "pass") total += 100;
    else if (c.status === "warn") total += 60;
    else total += 0;
  }
  return Math.round(total / checks.length);
}

export async function buildGeoReadinessReport(siteId: string, settings: SiteSettings, siteName: string): Promise<GeoReadinessReport> {
  const rows = await prisma.storeProduct.findMany({
    where: { siteId },
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      published: true,
      description: true,
      descriptionHtml: true,
      seoDescription: true,
      imageUrl: true,
      priceMinor: true,
      stockQty: true,
      keyFeaturesHtml: true,
      howToUseHtml: true,
      brand: { select: { name: true } },
      category: { select: { title: true } },
      images: { where: { mediaType: "image" }, take: 1, select: { url: true } },
    },
  });

  const reviewCounts = await getApprovedReviewCountsBySite(siteId);
  const published = rows.filter((r) => r.published);
  const productRows = published.map((r) => auditProduct(r, reviewCounts.get(r.id)?.count ?? 0));
  const productsWithReviews = published.filter(
    (r) => (reviewCounts.get(r.id)?.count ?? 0) > 0,
  ).length;
  const averageScore =
    productRows.length > 0
      ? Math.round(productRows.reduce((sum, p) => sum + p.score, 0) / productRows.length)
      : 0;
  const readyCount = productRows.filter((p) => p.score >= 80).length;
  const needsWork = productRows.filter((p) => p.score < 80);

  const publishedWithImage = published.filter((p) => p.imageUrl || p.images.length).length;
  const siteChecks = auditSite(settings, siteName, publishedWithImage, {
    withReviews: productsWithReviews,
    published: published.length,
  });
  const origin = getPublicSiteUrl();
  const gmcToken = settings.googleMerchant?.feedToken?.trim();
  const merchantPath = gmcToken
    ? `/feeds/google-merchant.xml?token=${encodeURIComponent(gmcToken)}`
    : "/feeds/google-merchant.xml";

  return {
    generatedAt: new Date().toISOString(),
    siteScore: siteScoreFromChecks(siteChecks),
    siteChecks,
    productSummary: {
      total: rows.length,
      published: published.length,
      averageScore,
      readyCount,
      needsWorkCount: needsWork.length,
    },
    products: needsWork.sort((a, b) => a.score - b.score).slice(0, 30),
    infraUrls: {
      llmsTxt: llmsTxtUrl(),
      productsJson: `${origin}${aiProductsFeedPath()}`,
      sitemap: `${origin}/sitemap.xml`,
      googleMerchant: `${origin}${merchantPath}`,
    },
  };
}
