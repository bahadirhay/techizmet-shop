import { getIntegrationConfig } from "@/lib/marketplace/actions";
import { readCatalogTitleCache } from "@/lib/marketplace/catalog-title-cache";
import { fetchTrendyolCatalog } from "@/lib/marketplace/trendyol/products";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import { prisma } from "@/lib/prisma";
import { safeRefineTitleFromCompetitors } from "@/lib/admin/product-seo/title-integrity";

const FETCH_TIMEOUT_MS = 8000;

const BROWSER_HEADERS = {
  Accept: "application/json, text/html;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9",
  Origin: "https://www.trendyol.com",
  Referer: "https://www.trendyol.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export type MarketplaceSearchDiagnostics = {
  /** Halka açık web araması — Vercel'de bilinçli olarak kullanılmıyor */
  trendyolPublic: "skipped" | "ok" | "blocked" | "empty" | "error";
  trendyolSeller: "ok" | "skipped" | "empty" | "error";
  trendyolSource?: "cache" | "db_listings" | "live_api";
  hepsiburada: "ok" | "empty" | "error";
};

export function buildMarketplaceSearchQuery(title: string, categoryTitle?: string, brandTitle?: string): string {
  const parts = [brandTitle, categoryTitle, title].filter(Boolean);
  return parts.join(" ").trim().slice(0, 120);
}

function buildQuery(title: string, categoryTitle?: string, brandTitle?: string): string {
  return buildMarketplaceSearchQuery(title, categoryTitle, brandTitle);
}

export function marketplaceQueryTokens(query: string): string[] {
  return queryTokens(query);
}

export function scoreMarketplaceTitleMatch(title: string, tokens: string[]): number {
  return scoreTitleMatch(title, tokens);
}

function queryTokens(query: string): string[] {
  return [...new Set(query.toLowerCase().split(/\s+/).filter((w) => w.length > 2))];
}

function scoreTitleMatch(title: string, tokens: string[]): number {
  const t = title.toLowerCase();
  return tokens.reduce((s, tok) => (t.includes(tok) ? s + 1 : s), 0);
}

function pickMatchingTitles(query: string, pool: string[], limit = 8): string[] {
  const tokens = queryTokens(query);
  if (!tokens.length || !pool.length) return [];
  return pool
    .map((title) => ({ title: title.trim(), score: scoreTitleMatch(title, tokens) }))
    .filter((x) => x.title.length > 5 && x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.title);
}

/** Trendyol web araması — sunucu IP (Vercel) engellenir; SEO akışında çağrılmaz */
export async function fetchTrendyolCompetitorTitles(_query: string): Promise<{
  titles: string[];
  status: MarketplaceSearchDiagnostics["trendyolPublic"];
}> {
  return { titles: [], status: "skipped" };
}

async function fetchTrendyolTitlesFromDbListings(siteId: string): Promise<string[]> {
  const rows = await prisma.marketplaceProductListing.findMany({
    where: { siteId, platform: "trendyol" },
    select: { product: { select: { title: true } } },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  return [...new Set(rows.map((r) => r.product.title.trim()).filter((t) => t.length > 5))];
}

/**
 * Trendyol başlık kaynakları (öncelik sırası):
 * 1. Katalog çek → config önbelleği
 * 2. Eşleşmiş ürün listeleri (DB)
 * 3. Canlı satıcı API
 */
export async function fetchTrendyolSellerCatalogTitles(
  siteId: string,
  query: string,
): Promise<{
  titles: string[];
  status: MarketplaceSearchDiagnostics["trendyolSeller"];
  source?: MarketplaceSearchDiagnostics["trendyolSource"];
  note?: string;
}> {
  const q = query.trim();
  if (!q) return { titles: [], status: "empty" };

  const config = await getIntegrationConfig(siteId, "trendyol");
  if (!config) {
    return {
      titles: [],
      status: "skipped",
      note: "Trendyol API bilgisi yok — Entegrasyonlar → Trendyol → kaydet ve Katalog çek",
    };
  }

  const { titles: cachedTitles, cachedAt } = readCatalogTitleCache(config);
  if (cachedTitles.length) {
    const titles = pickMatchingTitles(q, cachedTitles);
    if (titles.length) {
      const when = cachedAt ? new Date(cachedAt).toLocaleString("tr-TR") : "bilinmiyor";
      return {
        titles,
        status: "ok",
        source: "cache",
        note: `Trendyol katalog önbelleği (${cachedTitles.length} ürün, ${when})`,
      };
    }
  }

  const dbTitles = await fetchTrendyolTitlesFromDbListings(siteId);
  if (dbTitles.length) {
    const titles = pickMatchingTitles(q, dbTitles);
    if (titles.length) {
      return {
        titles,
        status: "ok",
        source: "db_listings",
        note: "Trendyol ile eşleşmiş mağaza ürün başlıkları",
      };
    }
  }

  const creds = parseTrendyolConfig(config);
  if (!creds) {
    return {
      titles: [],
      status: "skipped",
      note: "Satıcı ID, API Key ve Secret eksik — Bağlantıyı test et",
    };
  }

  try {
    const catalog = await fetchTrendyolCatalog(creds, { maxPages: 4 });
    if (!catalog.ok && catalog.items.length === 0) {
      const err = catalog.errors[0] ?? "API yanıt vermedi";
      return {
        titles: [],
        status: "error",
        note: `Trendyol satıcı API: ${err}`,
      };
    }

    const pool = catalog.items
      .map((item) => item.title?.trim())
      .filter((t): t is string => Boolean(t && t.length > 5));
    const titles = pickMatchingTitles(q, pool);

    if (titles.length) {
      return {
        titles,
        status: "ok",
        source: "live_api",
        note: `Trendyol canlı API (${catalog.items.length} ürün okundu)`,
      };
    }

    if (pool.length === 0) {
      return {
        titles: [],
        status: "empty",
        note: "Trendyol kataloğunuz boş — önce Trendyol'a ürün yükleyin veya Katalog çek",
      };
    }

    return {
      titles: [],
      status: "empty",
      note: `Katalogda ${pool.length} ürün var ama bu aramayla eşleşen başlık yok`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bilinmeyen hata";
    return { titles: [], status: "error", note: `Trendyol satıcı API isteği başarısız: ${msg}` };
  }
}

/** Mağaza DB — aynı kategorideki yayınlı ürün başlıkları */
export async function fetchLocalStoreCompetitorTitles(
  siteId: string,
  query: string,
  categoryIds: string[],
): Promise<string[]> {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];

  const products = await prisma.storeProduct.findMany({
    where: {
      siteId,
      published: true,
      ...(categoryIds.length
        ? {
            OR: [
              { categoryId: { in: categoryIds } },
              { categoryLinks: { some: { categoryId: { in: categoryIds } } } },
            ],
          }
        : {}),
    },
    select: { title: true },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  return products
    .map((p) => ({ title: p.title.trim(), score: scoreTitleMatch(p.title, tokens) }))
    .filter((x) => x.title.length > 5 && x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.title);
}

/** Hepsiburada halka açık arama sayfası */
export async function fetchHepsiburadaCompetitorTitles(query: string): Promise<{
  titles: string[];
  status: MarketplaceSearchDiagnostics["hepsiburada"];
}> {
  const q = query.trim();
  if (!q) return { titles: [], status: "empty" };

  try {
    const res = await fetch(`https://www.hepsiburada.com/ara?q=${encodeURIComponent(q)}`, {
      headers: { ...BROWSER_HEADERS, Accept: "text/html" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return { titles: [], status: res.status === 403 ? "error" : "empty" };
    const html = await res.text();
    const titles = new Set<string>();
    const patterns = [
      /"productName"\s*:\s*"([^"\\]{8,120})"/g,
      /data-test-id="product-name"[^>]*>([^<]{8,120})</g,
      /"name"\s*:\s*"([^"\\]{8,120})"/g,
    ];
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) && titles.size < 8) {
        const t = m[1]!.replace(/\\u[\dA-Fa-f]{4}/g, " ").trim();
        if (t.length > 8 && !t.includes("http")) titles.add(t);
      }
    }
    const list = [...titles].slice(0, 8);
    return { titles: list, status: list.length ? "ok" : "empty" };
  } catch {
    return { titles: [], status: "error" };
  }
}

export async function fetchMarketplaceCompetitorTitles(input: {
  siteId: string;
  title: string;
  categoryTitle?: string;
  brandTitle?: string;
  categoryIds?: string[];
}): Promise<{
  trendyol: string[];
  hepsiburada: string[];
  localStore: string[];
  diagnostics: MarketplaceSearchDiagnostics;
  notes: string[];
}> {
  const query = buildQuery(input.title, input.categoryTitle, input.brandTitle);
  const notes: string[] = [];

  const [trendyolPublic, trendyolSeller, hepsiburada, localStore] = await Promise.all([
    fetchTrendyolCompetitorTitles(query),
    fetchTrendyolSellerCatalogTitles(input.siteId, query),
    fetchHepsiburadaCompetitorTitles(query),
    fetchLocalStoreCompetitorTitles(input.siteId, query, input.categoryIds ?? []),
  ]);

  if (trendyolSeller.note) notes.push(trendyolSeller.note);

  const trendyol = [...new Set([...trendyolPublic.titles, ...trendyolSeller.titles])].slice(0, 8);

  return {
    trendyol,
    hepsiburada: hepsiburada.titles,
    localStore,
    diagnostics: {
      trendyolPublic: trendyolPublic.status,
      trendyolSeller: trendyolSeller.status,
      trendyolSource: trendyolSeller.source,
      hepsiburada: hepsiburada.status,
    },
    notes,
  };
}

export function refineTitleFromCompetitors(
  baseTitle: string,
  competitorTitles: string[],
  maxLen = 100,
): string {
  return safeRefineTitleFromCompetitors(baseTitle, competitorTitles, maxLen);
}
