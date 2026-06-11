import { getIntegrationConfig } from "@/lib/marketplace/actions";
import { readCatalogTitleCache } from "@/lib/marketplace/catalog-title-cache";
import { fetchTrendyolCatalog } from "@/lib/marketplace/trendyol/products";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import { fetchHepsiburadaCatalog } from "@/lib/marketplace/hepsiburada/products";
import {
  buildMarketplaceSearchQuery,
  marketplaceQueryTokens,
  scoreMarketplaceTitleMatch,
} from "@/lib/admin/product-seo/marketplace-search";

const FETCH_TIMEOUT_MS = 10000;

const BROWSER_HEADERS = {
  Accept: "application/json, text/html;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9",
  Origin: "https://www.trendyol.com",
  Referer: "https://www.trendyol.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export type CompetitorPriceRow = {
  platform: "trendyol" | "hepsiburada";
  title: string;
  brand?: string;
  priceMinor: number;
  originalPriceMinor?: number;
  url?: string;
  /** Satıcı adı — rakip veya kendi mağazanız */
  seller?: string;
  isOwnListing?: boolean;
  matchScore: number;
};

export type CompetitorPriceSummary = {
  count: number;
  minMinor: number | null;
  maxMinor: number | null;
  avgMinor: number | null;
};

export type CompetitorPriceDiagnostics = {
  trendyol: "ok" | "empty" | "blocked" | "error" | "skipped";
  hepsiburada: "ok" | "empty" | "error";
  ownTrendyol: "ok" | "skipped" | "empty" | "error";
  ownHepsiburada: "ok" | "skipped" | "empty" | "error";
};

export type CompetitorPriceReport = {
  query: string;
  items: CompetitorPriceRow[];
  summary: CompetitorPriceSummary;
  ownListings: CompetitorPriceRow[];
  diagnostics: CompetitorPriceDiagnostics;
  notes: string[];
  fetchedAt: string;
};

function tlToMinor(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function pickScoredRows<T extends { title: string; matchScore: number }>(
  query: string,
  rows: T[],
  limit = 12,
): T[] {
  const tokens = marketplaceQueryTokens(query);
  if (!tokens.length) return rows.slice(0, limit);
  return rows
    .map((row) => ({
      ...row,
      matchScore: row.matchScore || scoreMarketplaceTitleMatch(row.title, tokens),
    }))
    .filter((row) => row.title.length > 5 && row.matchScore > 0 && row.priceMinor > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.priceMinor - b.priceMinor)
    .slice(0, limit);
}

function summarize(items: CompetitorPriceRow[]): CompetitorPriceSummary {
  const prices = items.map((i) => i.priceMinor).filter((p) => p > 0);
  if (!prices.length) return { count: 0, minMinor: null, maxMinor: null, avgMinor: null };
  const sum = prices.reduce((s, p) => s + p, 0);
  return {
    count: prices.length,
    minMinor: Math.min(...prices),
    maxMinor: Math.max(...prices),
    avgMinor: Math.round(sum / prices.length),
  };
}

function parseTrendyolSearchProducts(json: unknown): CompetitorPriceRow[] {
  if (!json || typeof json !== "object") return [];
  const result = (json as Record<string, unknown>).result;
  if (!result || typeof result !== "object") return [];
  const products = (result as Record<string, unknown>).products;
  if (!Array.isArray(products)) return [];

  const rows: CompetitorPriceRow[] = [];
  for (const raw of products) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    const title = String(p.name ?? p.title ?? "").trim();
    if (title.length < 5) continue;

    const priceObj = p.price && typeof p.price === "object" ? (p.price as Record<string, unknown>) : {};
    const priceMinor =
      tlToMinor(priceObj.sellingPrice) ??
      tlToMinor(priceObj.discountedPrice) ??
      tlToMinor((priceObj.discountedPrice as Record<string, unknown> | undefined)?.value) ??
      tlToMinor(priceObj.current) ??
      null;
    if (priceMinor == null) continue;

    const originalPriceMinor =
      tlToMinor(priceObj.originalPrice) ??
      tlToMinor((priceObj.originalPrice as Record<string, unknown> | undefined)?.value) ??
      tlToMinor(priceObj.listPrice) ??
      undefined;

    const brandObj = p.brand && typeof p.brand === "object" ? (p.brand as Record<string, unknown>) : null;
    const brand = String(brandObj?.name ?? p.brandName ?? "").trim() || undefined;
    const merchantName = String(p.merchantName ?? p.sellerName ?? "").trim() || undefined;
    const urlPath = String(p.url ?? "").trim();
    const url = urlPath ? (urlPath.startsWith("http") ? urlPath : `https://www.trendyol.com${urlPath}`) : undefined;

    rows.push({
      platform: "trendyol",
      title,
      brand,
      priceMinor,
      originalPriceMinor,
      url,
      seller: merchantName,
      isOwnListing: false,
      matchScore: 0,
    });
  }
  return rows;
}

/** Trendyol halka açık arama — rakip listeleri */
export async function fetchTrendyolCompetitorPrices(query: string): Promise<{
  items: CompetitorPriceRow[];
  status: CompetitorPriceDiagnostics["trendyol"];
  note?: string;
}> {
  const q = query.trim();
  if (!q) return { items: [], status: "empty" };

  const params = new URLSearchParams({
    q,
    pi: "1",
    culture: "tr-TR",
    userGenderId: "1",
    pId: "0",
    scoringAlgorithmId: "2",
    categoryRelevancyEnabled: "false",
    isLegalRequirementConfirmed: "false",
    searchStrategyType: "DEFAULT",
    productStampType: "TypeA",
    fixSlotProductAdsIncluded: "false",
  });

  try {
    const res = await fetch(
      `https://public.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?${params}`,
      {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        cache: "no-store",
      },
    );

    if (res.status === 403 || res.status === 429) {
      return { items: [], status: "blocked", note: "Trendyol araması sunucu IP'sinden engellendi" };
    }
    if (!res.ok) return { items: [], status: "error", note: `Trendyol arama HTTP ${res.status}` };

    const json = (await res.json()) as unknown;
    const pool = parseTrendyolSearchProducts(json);
    const items = pickScoredRows(q, pool, 10);
    return {
      items,
      status: items.length ? "ok" : pool.length ? "empty" : "empty",
      note: items.length
        ? `${items.length} eşleşen Trendyol listesi`
        : pool.length
          ? "Trendyol sonuçları var ama arama ile eşleşmedi"
          : "Trendyol aramasında ürün bulunamadı",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bilinmeyen hata";
    return { items: [], status: "error", note: `Trendyol arama hatası: ${msg}` };
  }
}

function parseHbPriceFromHtml(html: string): CompetitorPriceRow[] {
  const rows: CompetitorPriceRow[] = [];
  const seen = new Set<string>();

  const productBlocks = html.match(/\{[^{}]*"productName"[^{}]*"price"[^{}]*\}/g) ?? [];
  for (const block of productBlocks) {
    const titleMatch = block.match(/"productName"\s*:\s*"([^"\\]{5,160})"/);
    const priceMatch =
      block.match(/"price"\s*:\s*([0-9]+(?:\.[0-9]+)?)/) ??
      block.match(/"salePrice"\s*:\s*([0-9]+(?:\.[0-9]+)?)/);
    if (!titleMatch || !priceMatch) continue;
    const title = titleMatch[1]!.replace(/\\u[\dA-Fa-f]{4}/g, " ").trim();
    const priceMinor = tlToMinor(priceMatch[1]);
    if (!priceMinor || seen.has(title)) continue;
    seen.add(title);
    rows.push({
      platform: "hepsiburada",
      title,
      priceMinor,
      matchScore: 0,
    });
  }

  if (rows.length >= 3) return rows;

  const altPattern =
    /"name"\s*:\s*"([^"\\]{5,160})"[\s\S]{0,220}?"(?:price|salePrice|lowestPrice)"\s*:\s*([0-9]+(?:\.[0-9]+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = altPattern.exec(html)) && rows.length < 16) {
    const title = m[1]!.replace(/\\u[\dA-Fa-f]{4}/g, " ").trim();
    const priceMinor = tlToMinor(m[2]);
    if (!priceMinor || seen.has(title)) continue;
    seen.add(title);
    rows.push({ platform: "hepsiburada", title, priceMinor, matchScore: 0 });
  }

  return rows;
}

/** Hepsiburada halka açık arama */
export async function fetchHepsiburadaCompetitorPrices(query: string): Promise<{
  items: CompetitorPriceRow[];
  status: CompetitorPriceDiagnostics["hepsiburada"];
  note?: string;
}> {
  const q = query.trim();
  if (!q) return { items: [], status: "empty" };

  try {
    const res = await fetch(`https://www.hepsiburada.com/ara?q=${encodeURIComponent(q)}`, {
      headers: { ...BROWSER_HEADERS, Accept: "text/html", Origin: "https://www.hepsiburada.com", Referer: "https://www.hepsiburada.com/" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return { items: [], status: res.status === 403 ? "error" : "empty" };
    const html = await res.text();
    const pool = parseHbPriceFromHtml(html);
    const items = pickScoredRows(q, pool, 10);
    return {
      items,
      status: items.length ? "ok" : pool.length ? "empty" : "empty",
      note: items.length ? `${items.length} eşleşen Hepsiburada listesi` : "Hepsiburada aramasında fiyat bulunamadı",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bilinmeyen hata";
    return { items: [], status: "error", note: `Hepsiburada arama hatası: ${msg}` };
  }
}

function catalogItemToOwnRow(
  platform: "trendyol" | "hepsiburada",
  item: { title?: string; barcode?: string; meta?: Record<string, unknown> },
  sellerLabel: string,
): CompetitorPriceRow | null {
  const title = item.title?.trim();
  if (!title) return null;
  const meta = item.meta ?? {};
  const priceMinor =
    platform === "trendyol"
      ? tlToMinor(meta.salePrice) ?? tlToMinor(meta.listPrice)
      : tlToMinor(meta.price) ?? tlToMinor(meta.salePrice);
  if (!priceMinor) return null;
  return {
    platform,
    title,
    priceMinor,
    originalPriceMinor: platform === "trendyol" ? tlToMinor(meta.listPrice) ?? undefined : undefined,
    seller: sellerLabel,
    isOwnListing: true,
    matchScore: 999,
  };
}

async function fetchOwnTrendyolPrice(
  siteId: string,
  barcode?: string,
  sku?: string,
): Promise<{ row: CompetitorPriceRow | null; status: CompetitorPriceDiagnostics["ownTrendyol"]; note?: string }> {
  const config = await getIntegrationConfig(siteId, "trendyol");
  if (!config) return { row: null, status: "skipped", note: "Trendyol API tanımlı değil" };

  const bc = barcode?.trim();
  const stockCode = sku?.trim();
  if (!bc && !stockCode) return { row: null, status: "empty" };

  const creds = parseTrendyolConfig(config);
  if (!creds) return { row: null, status: "skipped", note: "Trendyol satıcı bilgileri eksik" };

  try {
    const catalog = await fetchTrendyolCatalog(creds, { maxPages: 8 });
    const match = catalog.items.find((item) => {
      if (bc && item.barcode === bc) return true;
      if (stockCode && item.sku === stockCode) return true;
      return false;
    });
    if (!match) {
      return { row: null, status: "empty", note: "Trendyol kataloğunuzda barkod/SKU eşleşmesi yok" };
    }
    const row = catalogItemToOwnRow("trendyol", match, creds.sellerId ? `Mağazanız (${creds.sellerId})` : "Mağazanız");
    return row
      ? { row, status: "ok", note: "Trendyol satıcı API — kendi listeniz" }
      : { row: null, status: "empty", note: "Trendyol listesinde fiyat bilgisi yok" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bilinmeyen hata";
    return { row: null, status: "error", note: msg };
  }
}

async function fetchOwnHepsiburadaPrice(
  siteId: string,
  barcode?: string,
  sku?: string,
): Promise<{ row: CompetitorPriceRow | null; status: CompetitorPriceDiagnostics["ownHepsiburada"]; note?: string }> {
  const config = await getIntegrationConfig(siteId, "hepsiburada");
  if (!config) return { row: null, status: "skipped", note: "Hepsiburada API tanımlı değil" };

  const bc = barcode?.trim();
  const merchantSku = sku?.trim();
  if (!bc && !merchantSku) return { row: null, status: "empty" };

  try {
    const catalog = await fetchHepsiburadaCatalog(config, { maxPages: 8 });
    const match = catalog.items.find((item) => {
      if (bc && item.barcode === bc) return true;
      if (merchantSku && item.sku === merchantSku) return true;
      return false;
    });
    if (!match) {
      return { row: null, status: "empty", note: "Hepsiburada kataloğunuzda barkod/SKU eşleşmesi yok" };
    }
    const seller = config.sellerId?.trim() || config.merchantId?.trim() || "Mağazanız";
    const row = catalogItemToOwnRow("hepsiburada", match, `Mağazanız (${seller})`);
    return row
      ? { row, status: "ok", note: "Hepsiburada satıcı API — kendi listeniz" }
      : { row: null, status: "empty", note: "Hepsiburada listesinde fiyat bilgisi yok" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bilinmeyen hata";
    return { row: null, status: "error", note: msg };
  }
}

export async function fetchMarketplaceCompetitorPrices(input: {
  siteId: string;
  title: string;
  categoryTitle?: string;
  brandTitle?: string;
  barcode?: string;
  sku?: string;
}): Promise<CompetitorPriceReport> {
  const query = buildMarketplaceSearchQuery(input.title, input.categoryTitle, input.brandTitle);
  const notes: string[] = [];

  const [trendyol, hepsiburada, ownTy, ownHb] = await Promise.all([
    fetchTrendyolCompetitorPrices(query),
    fetchHepsiburadaCompetitorPrices(query),
    fetchOwnTrendyolPrice(input.siteId, input.barcode, input.sku),
    fetchOwnHepsiburadaPrice(input.siteId, input.barcode, input.sku),
  ]);

  if (trendyol.note) notes.push(trendyol.note);
  if (hepsiburada.note) notes.push(hepsiburada.note);
  if (ownTy.note) notes.push(ownTy.note);
  if (ownHb.note) notes.push(ownHb.note);

  const ownListings = [ownTy.row, ownHb.row].filter((r): r is CompetitorPriceRow => r != null);

  const competitorItems = [...trendyol.items, ...hepsiburada.items]
    .filter((row) => {
      if (!ownListings.length) return true;
      return !ownListings.some(
        (own) => own.platform === row.platform && Math.abs(own.priceMinor - row.priceMinor) < 100 && own.title === row.title,
      );
    })
    .sort((a, b) => a.priceMinor - b.priceMinor);

  if (trendyol.status === "blocked") {
    notes.push("Trendyol rakip araması engellendi — yerel geliştirmede tekrar deneyin veya kendi Trendyol fiyatınıza bakın");
  }

  return {
    query,
    items: competitorItems,
    summary: summarize(competitorItems),
    ownListings,
    diagnostics: {
      trendyol: trendyol.status,
      hepsiburada: hepsiburada.status,
      ownTrendyol: ownTy.status,
      ownHepsiburada: ownHb.status,
    },
    notes,
    fetchedAt: new Date().toISOString(),
  };
}
