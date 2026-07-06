import "server-only";

import { probeHomeLcpFromOrigin } from "@/lib/admin/site-performance/home-lcp-probe";
import { scanSeoDashboard } from "@/lib/admin/seo-dashboard/scan";
import { scanSearchIntents } from "@/lib/admin/search-intent/scan";
import { seoAiAvailable, getSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import type {
  SitePerfCheck,
  SitePerformanceReport,
  SitePerfPsiScore,
} from "@/lib/admin/site-performance/types";
import { getSiteBranding, parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

function summarize(checks: SitePerfCheck[]) {
  return checks.reduce(
    (acc, c) => {
      acc[c.status] += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0, info: 0 },
  );
}

async function probeResizeApi(origin: string, imagePath: string): Promise<boolean> {
  const src = encodeURIComponent(imagePath);
  const url = `${origin}/api/resize-image?w=120&src=${src}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}

function parsePsiMetric(audits: Record<string, { numericValue?: number }> | undefined, id: string): number | null {
  const v = audits?.[id]?.numericValue;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function runPsi(url: string, strategy: "mobile" | "desktop"): Promise<SitePerfPsiScore> {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY?.trim();
  if (!key) {
    return {
      strategy,
      performance: null,
      lcpMs: null,
      cls: null,
      fcpMs: null,
      error: "GOOGLE_PAGESPEED_API_KEY tanımlı değil — canlı Lighthouse skoru atlandı",
    };
  }
  const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  api.searchParams.set("url", url);
  api.searchParams.set("strategy", strategy);
  api.searchParams.set("category", "performance");
  api.searchParams.set("key", key);

  try {
    const res = await fetch(api, { cache: "no-store" });
    const json = (await res.json()) as {
      error?: { message?: string };
      lighthouseResult?: {
        categories?: { performance?: { score?: number } };
        audits?: Record<string, { numericValue?: number }>;
      };
    };
    if (!res.ok) {
      return {
        strategy,
        performance: null,
        lcpMs: null,
        cls: null,
        fcpMs: null,
        error: json.error?.message ?? `PageSpeed API HTTP ${res.status}`,
      };
    }
    const lr = json.lighthouseResult;
    const score = lr?.categories?.performance?.score;
    return {
      strategy,
      performance: typeof score === "number" ? Math.round(score * 100) : null,
      lcpMs: parsePsiMetric(lr?.audits, "largest-contentful-paint"),
      cls: parsePsiMetric(lr?.audits, "cumulative-layout-shift"),
      fcpMs: parsePsiMetric(lr?.audits, "first-contentful-paint"),
    };
  } catch (e) {
    return {
      strategy,
      performance: null,
      lcpMs: null,
      cls: null,
      fcpMs: null,
      error: e instanceof Error ? e.message : "PageSpeed isteği başarısız",
    };
  }
}

export async function scanSitePerformance(siteId: string): Promise<SitePerformanceReport> {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId } });
  if (!site) throw new Error("Site bulunamadı");

  const settings = parseSiteSettings(site.settingsJson);
  const branding = getSiteBranding(settings);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_STORE_URL?.trim() ||
    "http://localhost:5555";
  const origin = siteUrl.replace(/\/$/, "");

  const [seoDash, intents, aiCfg, sampleMedia] = await Promise.all([
    scanSeoDashboard(siteId),
    scanSearchIntents(siteId),
    getSeoAiConfig(siteId),
    prisma.storeMedia.findFirst({
      where: { siteId, mimeType: { startsWith: "image/" } },
      select: { url: true },
    }),
  ]);

  const aiEnabled = seoAiAvailable(aiCfg).any;
  const intentFails = intents.reports.filter((r) =>
    r.checks.some((c) => c.id === "landing-meta" && c.status === "fail"),
  ).length;
  const resizeProbePath =
    sampleMedia?.url?.startsWith("/uploads/") || sampleMedia?.url?.startsWith("/theme/")
      ? sampleMedia.url.split("?")[0]!
      : "/theme/techizmet-shop/cdn/shop/files/18af34f.jpg";
  const resizeOk = await probeResizeApi(origin, resizeProbePath);
  const homeLcp = await probeHomeLcpFromOrigin(origin);

  const checks: SitePerfCheck[] = [
    {
      id: "render-blocking-css",
      lighthouseId: "render-blocking-resources",
      label: "Oluşturma engelleyen CSS",
      explanation:
        "Ana sayfa kabuğunun indirdiği CSS, tarayıcı ilk çizimi yapmadan önce bekletir. Kritik dışı bölüm ve çekmece CSS'i ertelenmeli.",
      status: homeLcp.ok ? "pass" : "warn",
      detail: homeLcp.ok
        ? "Media-grid CSS kritik; diğer bölüm + cart/account/search CSS deferred yüklenir."
        : `CSS/hero: ${homeLcp.detail}`,
      fixLabel: "Performans düzeltmelerini uygula",
      fixAction: "perf-apply-fixes",
    },
    {
      id: "cls-hero-layout",
      lighthouseId: "layout-shift",
      label: "CLS — hero görsel yerleşimi",
      explanation:
        "LCP hero görselinde width/height ve srcset hataları sayfa yüklenirken büyük kaymaya (CLS) neden olur.",
      status: homeLcp.ok ? "pass" : "fail",
      detail: homeLcp.detail,
      fixLabel: "Performans düzeltmelerini uygula",
      fixAction: "perf-apply-fixes",
    },
    {
      id: "legacy-js",
      lighthouseId: "legacy-javascript",
      label: "Eski JavaScript (polyfill)",
      explanation:
        "Next.js bazen Array.at, Object.hasOwn gibi modern tarayıcılarda zaten var olan özellikler için ek JS yükler (~12 KiB).",
      status: "pass",
      detail: "Modern tarayıcı hedefi ve polyfill modülü devre dışı (Chrome 111+, Safari 16.4+).",
    },
    {
      id: "lcp-hero-image",
      lighthouseId: "largest-contentful-paint",
      label: "LCP hero görseli",
      explanation:
        "Ana sayfadaki ilk media-grid görseli LCP adayıdır; lazy olmamalı, küçültülmüş ve fetchpriority=high ile sunulmalı.",
      status: homeLcp.ok ? "pass" : "fail",
      detail: homeLcp.detail,
      fixLabel: "Performans düzeltmelerini uygula",
      fixAction: "perf-apply-fixes",
    },
    {
      id: "image-delivery",
      lighthouseId: "uses-optimized-images",
      label: "Görsel boyutlandırma (resize API)",
      explanation:
        "Hero ve ürün görselleri tam boy JPG yerine küçültülmüş WebP ile sunulmalı; ağ yükü ve LCP buna bağlı.",
      status: resizeOk ? "pass" : "fail",
      detail: resizeOk
        ? `Resize API çalışıyor (${resizeProbePath})`
        : `Resize API yanıt vermiyor — görseller kırık veya yavaş olabilir (${resizeProbePath})`,
      fixLabel: "Performans düzeltmelerini uygula",
      fixAction: "perf-apply-fixes",
    },
    {
      id: "iframe-architecture",
      label: "Mirror iframe mimarisi",
      explanation:
        "Vitrin tema HTML'i iframe içinde yüklenir. Lighthouse bazen LCP'yi parent pencerede ölçemez (NO_LCP) veya Speed Index yüksek çıkar — bu mimari sınırdır.",
      status: "info",
      detail:
        "Tasarımı bozmadan kısmi iyileştirme yapılır; tam çözüm ileride native React vitrin olur. Şu an görsel resize + CSS ayrımı en güvenli adım.",
    },
    {
      id: "product-meta",
      lighthouseId: "meta-description",
      label: "Ürün SEO meta",
      explanation: "Kısa veya eksik ürün meta açıklamaları arama ve tıklama oranını düşürür.",
      status:
        seoDash.summary.products.missingMeta === 0 && seoDash.summary.products.weak === 0
          ? "pass"
          : seoDash.summary.products.missingMeta > 0
            ? "fail"
            : "warn",
      detail: `${seoDash.summary.products.missingMeta} eksik meta, ${seoDash.summary.products.weak} zayıf açıklama (${seoDash.summary.products.published} yayınlı ürün)`,
      fixLabel: aiEnabled ? "AI ile ürün meta düzelt" : "SEO AI ayarla",
      fixHref: aiEnabled ? undefined : "/admin/settings/seo-ai",
      fixAction: aiEnabled ? "seo-dashboard-fix" : undefined,
    },
    {
      id: "landing-intent-meta",
      label: "Hedef arama landing meta",
      explanation:
        "Google hedef sorguları (ör. doğal köpek ödülü) için koleksiyon sayfası başlık ve açıklaması özelleştirilmeli.",
      status: intentFails === 0 ? "pass" : intentFails <= 3 ? "warn" : "fail",
      detail:
        intentFails === 0
          ? `${intents.reports.length} hedef sorgunun landing meta'sı uygun`
          : `${intentFails} hedef sorguda landing meta eksik veya zayıf`,
      fixLabel: "Hedef Aramalar",
      fixHref: "/admin/settings/search-intent",
    },
    {
      id: "logo-weight",
      label: "Logo / favicon",
      explanation: "Ağır PNG logo header'da gereksiz bayt taşır.",
      status: branding.logoUrl?.includes("/api/resize-image") || branding.logoUrl?.includes("/api/media/")
        ? "pass"
        : branding.logoUrl?.includes("/uploads/")
          ? "warn"
          : "info",
      detail: branding.logoUrl
        ? `Aktif logo: ${branding.logoUrl}`
        : "Varsayılan tema logosu kullanılıyor",
      fixLabel: "Logo & meta",
      fixHref: "/admin/settings/seo",
    },
  ];

  const psiKey = process.env.GOOGLE_PAGESPEED_API_KEY?.trim();
  let psi: SitePerformanceReport["psi"];
  if (psiKey) {
    const [mobile, desktop] = await Promise.all([
      runPsi(`${origin}/`, "mobile"),
      runPsi(`${origin}/`, "desktop"),
    ]);
    psi = { mobile, desktop };

    if (mobile.performance !== null) {
      checks.push({
        id: "psi-mobile",
        label: "Canlı mobil performans (PageSpeed)",
        explanation: "Google PageSpeed Insights — gerçek Lighthouse ölçümü, deploy sonrası doğrulama için.",
        status: mobile.performance >= 90 ? "pass" : mobile.performance >= 50 ? "warn" : "fail",
        detail: `Skor ${mobile.performance} · LCP ${mobile.lcpMs ? `${(mobile.lcpMs / 1000).toFixed(1)} sn` : "—"} · CLS ${mobile.cls?.toFixed(3) ?? "—"}`,
      });
    } else if (mobile.error && !mobile.error.includes("tanımlı değil")) {
      checks.push({
        id: "psi-mobile",
        label: "Canlı mobil performans (PageSpeed)",
        explanation: "PageSpeed API ile canlı ölçüm.",
        status: "warn",
        detail: mobile.error,
      });
    }
  }

  return {
    scannedAt: new Date().toISOString(),
    siteUrl: origin,
    checks,
    summary: summarize(checks),
    psi,
    aiEnabled,
  };
}
