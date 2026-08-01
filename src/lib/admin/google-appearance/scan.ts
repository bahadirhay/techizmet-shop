import "server-only";

import { loadSiteSeoPages } from "@/lib/admin/site-seo/page-loader";
import { LANDING_COLLECTION_SLUGS } from "@/lib/seo/search-intent";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import {
  findLegacyThemeHits,
  type LegacyThemeHit,
} from "@/lib/mirror-theme-copy-sanitize";
import { getSiteSeo, parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";
import { VITRIN_PAGES } from "@/lib/mirror-vitrin-pages";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";

export type GoogleAppearanceFinding = {
  source: "live" | "settings";
  path: string;
  label: string;
  field?: string;
  hits: LegacyThemeHit[];
  excerpt?: string;
};

export type GoogleAppearanceScanResult = {
  scannedAt: string;
  siteName: string;
  siteUrl: string;
  summary: {
    urlsScanned: number;
    settingsFieldsScanned: number;
    fail: number;
    warn: number;
    clean: number;
  };
  findings: GoogleAppearanceFinding[];
};

function excerptAround(hay: string, needle: string, radius = 60): string {
  const idx = hay.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return hay.slice(0, 120);
  const start = Math.max(0, idx - radius);
  const end = Math.min(hay.length, idx + needle.length + radius);
  return `${start > 0 ? "…" : ""}${hay.slice(start, end).replace(/\s+/g, " ")}${end < hay.length ? "…" : ""}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectSettingsText(
  settings: SiteSettings,
  siteName: string,
): Array<{ path: string; label: string; field: string; text: string }> {
  const out: Array<{ path: string; label: string; field: string; text: string }> = [];
  const seo = getSiteSeo(settings, siteName);

  const push = (path: string, label: string, field: string, text: unknown) => {
    if (typeof text !== "string" || !text.trim()) return;
    out.push({ path, label, field, text });
  };

  push("/", "Site meta", "seo.metaDescription", seo.metaDescription);
  push("/", "Site meta", "seo.siteTitle", seo.siteTitle);
  push("/", "Site meta", "seo.organizationName", seo.organizationName);

  for (const [path, meta] of Object.entries(seo.staticPages ?? {})) {
    push(path, `staticPages ${path}`, "seoTitle", meta.seoTitle);
    push(path, `staticPages ${path}`, "seoDescription", meta.seoDescription);
    push(path, `staticPages ${path}`, "imageAlt", meta.imageAlt);
  }

  const texts = settings.store?.texts as Record<string, unknown> | undefined;
  if (texts) {
    for (const [key, value] of Object.entries(texts)) {
      if (typeof value === "string") {
        push("/collections", "Mağaza metinleri", `store.texts.${key}`, value);
      }
    }
  }

  for (const page of VITRIN_PAGES) {
    const cfg = getMirrorPageConfig(settings, page.key);
    for (const [elId, edit] of Object.entries(cfg.elements ?? {})) {
      const e = edit as { html?: string; htmlEn?: string; text?: string };
      push(page.route, page.label, `elements.${elId}.html`, e.html);
      push(page.route, page.label, `elements.${elId}.htmlEn`, e.htmlEn);
      push(page.route, page.label, `elements.${elId}.text`, e.text);
    }
    for (const [sectionKey, section] of Object.entries(cfg.sections ?? {})) {
      push(page.route, page.label, `sections.${sectionKey}.headingHtml`, section?.headingHtml);
      push(page.route, page.label, `sections.${sectionKey}.marqueeHtml`, section?.marqueeHtml);
    }
  }

  return out;
}

async function fetchLivePage(
  origin: string,
  path: string,
): Promise<{ title: string; h1: string; description: string; body: string } | null> {
  const url = `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html",
        "User-Agent": "AnatolianPaw-SeoScanner/1.0",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
    const description =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] ??
      "";
    const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
      stripHtml(m[1] ?? ""),
    );
    const body = stripHtml(html).slice(0, 20_000);
    return { title, h1: h1Matches.join(" | "), description, body };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function scanGoogleAppearance(siteId: string): Promise<GoogleAppearanceScanResult> {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId } });
  if (!site) throw new Error("Site yok");
  const settings = parseSiteSettings(site.settingsJson);
  const siteName = site.name;
  const siteUrl = getPublicSiteUrl();
  const findings: GoogleAppearanceFinding[] = [];

  // 1) Ayarlar / vitrin düzenlemeleri
  const settingRows = collectSettingsText(settings, siteName);
  for (const row of settingRows) {
    const hits = findLegacyThemeHits(row.text);
    if (!hits.length) continue;
    findings.push({
      source: "settings",
      path: row.path,
      label: row.label,
      field: row.field,
      hits,
      excerpt: excerptAround(row.text, hits[0]!.phrase),
    });
  }

  // 2) Canlı URL’ler
  const seoPages = await loadSiteSeoPages(siteId, siteName, settings);
  const pathSet = new Set<string>();
  const paths: Array<{ path: string; label: string }> = [];
  const addPath = (path: string, label: string) => {
    if (pathSet.has(path)) return;
    pathSet.add(path);
    paths.push({ path, label });
  };

  for (const p of seoPages) addPath(p.path, p.title);
  for (const slug of LANDING_COLLECTION_SLUGS) {
    addPath(`/collections/${slug}`, `Landing: ${slug}`);
  }
  addPath("/pages/about", "Hakkımızda");
  addPath("/pages/faq", "SSS");

  const products = await prisma.storeProduct.findMany({
    where: { siteId, published: true, storeVisible: true },
    select: { slug: true, title: true },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });
  for (const p of products) addPath(`/products/${p.slug}`, p.title);

  let liveOk = 0;
  for (const { path, label } of paths) {
    const live = await fetchLivePage(siteUrl, path);
    if (!live) continue;
    const blob = `${live.title}\n${live.h1}\n${live.description}\n${live.body}`;
    const hits = findLegacyThemeHits(blob);
    if (!hits.length) {
      liveOk += 1;
      continue;
    }
    findings.push({
      source: "live",
      path,
      label,
      hits,
      excerpt: excerptAround(blob, hits[0]!.phrase),
    });
  }

  let fail = 0;
  let warn = 0;
  for (const f of findings) {
    if (f.hits.some((h) => h.severity === "fail")) fail += 1;
    else warn += 1;
  }

  return {
    scannedAt: new Date().toISOString(),
    siteName,
    siteUrl,
    summary: {
      urlsScanned: paths.length,
      settingsFieldsScanned: settingRows.length,
      fail,
      warn,
      clean: liveOk,
    },
    findings,
  };
}
