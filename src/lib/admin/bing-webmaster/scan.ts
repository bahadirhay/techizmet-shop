import "server-only";

import { auditSiteSeo } from "@/lib/admin/site-seo/optimizer";
import type { BingMetaShortRow, BingRecommendation, BingWebmasterScan } from "@/lib/admin/bing-webmaster/types";
import { getSeoAiConfig, seoAiAvailable } from "@/lib/admin/product-seo/ai-settings";
import { ensureIndexNowKey, indexNowKeyFileUrl } from "@/lib/seo/indexnow";
import { getSiteDistribution } from "@/lib/seo/distribution-settings";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { getSiteSeo, parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

/** Bing Webmaster — kısa meta uyarısı eşiği */
export const BING_META_DESC_MIN = 120;

async function checkIndexNowKeyFile(key: string): Promise<boolean> {
  const url = indexNowKeyFileUrl(key);
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const text = (await res.text()).trim();
    return text === key;
  } catch {
    return false;
  }
}

function isShortMeta(value: string | null | undefined): boolean {
  const len = value?.trim().length ?? 0;
  return len > 0 && len < BING_META_DESC_MIN;
}

function isMissingMeta(value: string | null | undefined): boolean {
  return !value?.trim();
}

export async function scanBingWebmaster(siteId: string): Promise<BingWebmasterScan> {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId } });
  if (!site) throw new Error("Site bulunamadı");

  const settings = parseSiteSettings(site.settingsJson);
  const seo = getSiteSeo(settings, site.name);
  const distribution = getSiteDistribution(settings);
  const key = ensureIndexNowKey(distribution);
  const keyFileUrl = indexNowKeyFileUrl(key);
  const siteUrl = getPublicSiteUrl();
  const aiConfig = await getSeoAiConfig(siteId);
  const ai = seoAiAvailable(aiConfig);

  const [keyFileOk, pagesAudit, products] = await Promise.all([
    checkIndexNowKeyFile(key),
    auditSiteSeo(siteId),
    prisma.storeProduct.findMany({
      where: { siteId, published: true },
      select: { id: true, slug: true, title: true, seoDescription: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const shortPageRows: BingMetaShortRow[] = [];
  for (const page of pagesAudit.pages) {
    const len = page.seoDescription.trim().length;
    if (!isMissingMeta(page.seoDescription) && isShortMeta(page.seoDescription)) {
      shortPageRows.push({
        kind: "page",
        id: page.id,
        title: page.title,
        path: page.path,
        length: len,
        adminUrl:
          page.kind === "blog-post" && page.entityId
            ? `/admin/blog/${page.entityId}`
            : page.kind === "cms" && page.entityId
              ? `/admin/pages/${page.entityId}`
              : "/admin/settings/seo",
      });
    }
  }

  const shortProductRows: BingMetaShortRow[] = [];
  for (const p of products) {
    const len = p.seoDescription?.trim().length ?? 0;
    if (isMissingMeta(p.seoDescription) || isShortMeta(p.seoDescription)) {
      shortProductRows.push({
        kind: "product",
        id: p.id,
        title: p.title,
        path: `/products/${p.slug}`,
        length: len,
        adminUrl: `/admin/products/${p.id}/edit`,
      });
    }
  }

  const shortPages = shortPageRows.length;
  const shortProducts = shortProductRows.length;
  const examples = [...shortPageRows, ...shortProductRows]
    .sort((a, b) => a.length - b.length)
    .slice(0, 12);

  const indexNowOk =
    keyFileOk &&
    Boolean(distribution.lastIndexNowAt) &&
    Boolean(distribution.lastSitemapPingAt);

  const recommendations: BingRecommendation[] = [
    {
      id: "bing-verification",
      title: "Bing site doğrulaması",
      status: seo.bingVerification ? "pass" : "warn",
      detail: seo.bingVerification
        ? "msvalidate.01 kodu tanımlı — Bing Webmaster'da doğrulayın"
        : "Admin panelden Bing doğrulama kodunu kaydedin",
      bingLabel: "Site doğrulama",
    },
    {
      id: "indexnow",
      title: "IndexNow kurulumu",
      status: indexNowOk ? "pass" : keyFileOk ? "warn" : "fail",
      detail: keyFileOk
        ? distribution.lastIndexNowAt
          ? `Aktif — son bildirim ${new Date(distribution.lastIndexNowAt).toLocaleString("tr-TR")}`
          : "Anahtar dosyası hazır — ilk IndexNow gönderimini başlatın"
        : "indexnow-key.txt erişilemiyor veya anahtar eşleşmiyor",
      bingLabel: "En iyi öneri",
    },
    {
      id: "sitemap",
      title: "Site haritası",
      status: "pass",
      detail: `${siteUrl}/sitemap.xml — Bing Webmaster → Site Haritaları'na ekleyin`,
      bingLabel: "Site Haritaları",
    },
    {
      id: "meta-descriptions",
      title: "Meta açıklamaları çok kısa",
      status: shortPages + shortProducts === 0 ? "pass" : "warn",
      detail:
        shortPages + shortProducts === 0
          ? `Tüm yayınlı sayfa/ürünlerde en az ${BING_META_DESC_MIN} karakter`
          : `${shortPages} sayfa + ${shortProducts} ürün — Bing için ${BING_META_DESC_MIN}+ karakter önerilir`,
      bingLabel: "En iyi öneri",
    },
    {
      id: "backlinks",
      title: "Kaliteli geri bağlantılar",
      status: "warn",
      detail:
        "Kod ile otomatik eklenemez — Pinterest, blog, sektör dizinleri ve iş birlikleri ile güçlendirin",
      bingLabel: "En iyi öneri",
    },
  ];

  return {
    scannedAt: new Date().toISOString(),
    siteUrl,
    recommendations,
    indexNow: {
      key,
      keyFileUrl,
      keyFileOk,
      lastIndexNowAt: distribution.lastIndexNowAt ?? null,
      lastSitemapPingAt: distribution.lastSitemapPingAt ?? null,
      automated: true,
    },
    bingVerification: {
      configured: Boolean(seo.bingVerification),
      value: seo.bingVerification,
    },
    metaDescriptions: {
      minRecommended: BING_META_DESC_MIN,
      shortPages,
      shortProducts,
      totalShort: shortPages + shortProducts,
      examples,
    },
    backlinks: {
      detail: "Bing → Bağlantılar raporunu izleyin; içerik ve sosyal kanallardan organik link kazanın",
      externalUrl: "https://www.bing.com/webmasters/backlinks",
    },
    urls: {
      sitemap: `${siteUrl}/sitemap.xml`,
      bingWebmaster: "https://www.bing.com/webmasters",
      indexNowKey: keyFileUrl,
      bingSiteAuth: `${siteUrl}/BingSiteAuth.xml`,
    },
    aiEnabled: ai.any,
  };
}
