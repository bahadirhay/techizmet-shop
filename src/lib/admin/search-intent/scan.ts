import "server-only";

import { htmlToPlainText } from "@/lib/html-plain-text";
import { getSeoAiConfig, seoAiAvailable } from "@/lib/admin/product-seo/ai-settings";
import type { SearchIntentTarget } from "@/lib/seo/search-intent";
import { getSearchIntents } from "@/lib/seo/search-intent";
import { getSiteSeo, parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

export type SearchIntentCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

export type SearchIntentReport = {
  intent: SearchIntentTarget;
  score: number;
  checks: SearchIntentCheck[];
  matchingProducts: number;
  publishedProducts: number;
};

function scoreChecks(checks: SearchIntentCheck[]): number {
  if (!checks.length) return 0;
  let total = 0;
  for (const c of checks) {
    if (c.status === "pass") total += 100;
    else if (c.status === "warn") total += 55;
    else total += 0;
  }
  return Math.round(total / checks.length);
}

function productMatchesIntent(
  product: {
    title: string;
    seoTitle: string | null;
    seoDescription: string | null;
    description: string | null;
    descriptionHtml: string | null;
  },
  intent: SearchIntentTarget,
): boolean {
  const blob = [
    product.title,
    product.seoTitle,
    product.seoDescription,
    product.description,
    product.descriptionHtml ? htmlToPlainText(product.descriptionHtml) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");
  const hits = intent.productKeywords.filter((kw) => blob.includes(kw.toLocaleLowerCase("tr-TR")));
  return hits.length >= Math.min(3, intent.productKeywords.length);
}

export async function scanSearchIntents(siteId: string): Promise<{
  scannedAt: string;
  aiEnabled: boolean;
  reports: SearchIntentReport[];
}> {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId } });
  if (!site) throw new Error("Site bulunamadı");

  const settings = parseSiteSettings(site.settingsJson);
  const seo = getSiteSeo(settings, site.name);
  const intents = getSearchIntents(settings);
  const ai = seoAiAvailable(await getSeoAiConfig(siteId));

  const products = await prisma.storeProduct.findMany({
    where: { siteId, published: true },
    select: {
      title: true,
      seoTitle: true,
      seoDescription: true,
      description: true,
      descriptionHtml: true,
    },
  });

  const staticAll = seo.staticPages?.["/collections/all"];
  const reports: SearchIntentReport[] = [];

  for (const intent of intents) {
    const checks: SearchIntentCheck[] = [];
    const landingMetaTitle = staticAll?.seoTitle?.trim() || "";
    const landingMetaDesc = staticAll?.seoDescription?.trim() || "";
    const queryInTitle = landingMetaTitle.toLocaleLowerCase("tr-TR").includes(
      intent.query.split(" ")[0]?.toLocaleLowerCase("tr-TR") ?? "",
    );

    checks.push({
      id: "landing-meta",
      label: "Landing meta (hedef sorgu)",
      status:
        landingMetaDesc.length >= 120 && queryInTitle
          ? "pass"
          : landingMetaDesc.length >= 70
            ? "warn"
            : "fail",
      detail:
        landingMetaDesc.length >= 120
          ? `Açıklama ${landingMetaDesc.length} karakter`
          : `Uygula ile ${intent.query} için meta atanmalı (${landingMetaDesc.length || 0} kr.)`,
    });

    checks.push({
      id: "faq-schema",
      label: "FAQ schema (AI Özeti)",
      status: intent.faqs.length >= 3 ? "pass" : "warn",
      detail: `${intent.faqs.length} SSS — koleksiyon sayfasında JSON-LD`,
    });

    const matching = products.filter((p) => productMatchesIntent(p, intent)).length;
    checks.push({
      id: "product-keywords",
      label: "Anahtar kelimeli ürünler",
      status: matching >= 3 ? "pass" : matching >= 1 ? "warn" : "fail",
      detail: `${matching}/${products.length} ürün hedef kelimeleri içeriyor`,
    });

    const weakMeta = products.filter(
      (p) => (p.seoDescription?.trim().length ?? 0) < 120,
    ).length;
    checks.push({
      id: "product-meta-length",
      label: "Ürün meta uzunluğu",
      status: weakMeta === 0 ? "pass" : weakMeta <= products.length / 2 ? "warn" : "fail",
      detail: `${weakMeta} üründe SEO açıklaması 120 karakterden kısa`,
    });

    checks.push({
      id: "merchant-feed",
      label: "Google Merchant feed",
      status: settings.googleMerchant?.enabled !== false ? "pass" : "warn",
      detail: "Alışveriş / AI karuseli için feed gerekli",
    });

    reports.push({
      intent,
      score: scoreChecks(checks),
      checks,
      matchingProducts: matching,
      publishedProducts: products.length,
    });
  }

  return {
    scannedAt: new Date().toISOString(),
    aiEnabled: ai.any,
    reports,
  };
}
