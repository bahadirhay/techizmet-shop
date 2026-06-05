import { getIntegrationConfig } from "@/lib/marketplace/actions";
import { fetchTrendyolCatalog } from "@/lib/marketplace/trendyol/products";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import { prisma } from "@/lib/prisma";

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
  trendyolPublic: "ok" | "blocked" | "empty" | "error";
  trendyolSeller: "ok" | "skipped" | "empty" | "error";
  hepsiburada: "ok" | "empty" | "error";
};

function buildQuery(title: string, categoryTitle?: string, brandTitle?: string): string {
  const parts = [brandTitle, categoryTitle, title].filter(Boolean);
  return parts.join(" ").trim().slice(0, 120);
}

function queryTokens(query: string): string[] {
  return [...new Set(query.toLowerCase().split(/\s+/).filter((w) => w.length > 2))];
}

function scoreTitleMatch(title: string, tokens: string[]): number {
  const t = title.toLowerCase();
  return tokens.reduce((s, tok) => (t.includes(tok) ? s + 1 : s), 0);
}

/** Trendyol halka açık arama — Vercel/sunucu IP'lerinde çoğunlukla 403 */
export async function fetchTrendyolCompetitorTitles(query: string): Promise<{
  titles: string[];
  status: MarketplaceSearchDiagnostics["trendyolPublic"];
}> {
  const q = query.trim();
  if (!q) return { titles: [], status: "empty" };

  const urls = [
    `https://apigw.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?q=${encodeURIComponent(q)}&pi=1&culture=tr-TR&storefrontId=1&countryCode=TR`,
    `https://public.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?q=${encodeURIComponent(q)}&pi=1&culture=tr-TR&storefrontId=1&countryCode=TR`,
  ];

  let saw403 = false;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        cache: "no-store",
      });
      if (res.status === 403 || res.status === 401) {
        saw403 = true;
        continue;
      }
      if (!res.ok) continue;
      const data = (await res.json()) as {
        result?: { products?: { name?: string }[] };
        products?: { name?: string }[];
      };
      const products = data.result?.products ?? data.products ?? [];
      const titles = products
        .map((p) => p.name?.trim())
        .filter((n): n is string => Boolean(n && n.length > 5))
        .slice(0, 8);
      if (titles.length) return { titles, status: "ok" };
    } catch {
      /* sonraki URL */
    }
  }

  return { titles: [], status: saw403 ? "blocked" : "empty" };
}

/** Trendyol satıcı API — kendi kataloğunuzdan benzer başlıklar (403'e takılmaz) */
export async function fetchTrendyolSellerCatalogTitles(
  siteId: string,
  query: string,
): Promise<{ titles: string[]; status: MarketplaceSearchDiagnostics["trendyolSeller"]; note?: string }> {
  const q = query.trim();
  if (!q) return { titles: [], status: "empty" };

  const config = await getIntegrationConfig(siteId, "trendyol");
  const creds = config ? parseTrendyolConfig(config) : null;
  if (!creds) {
    return {
      titles: [],
      status: "skipped",
      note: "Trendyol satıcı API bilgisi yok — Entegrasyonlar → Trendyol",
    };
  }

  try {
    const catalog = await fetchTrendyolCatalog(creds, { maxPages: 4 });
    const tokens = queryTokens(q);
    const titles = catalog.items
      .map((item) => ({ title: item.title?.trim() ?? "", score: scoreTitleMatch(item.title ?? "", tokens) }))
      .filter((x) => x.title.length > 5 && x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.title);

    if (titles.length) {
      return { titles, status: "ok", note: "Trendyol satıcı kataloğunuzdan eşleşen başlıklar" };
    }
    return {
      titles: [],
      status: "empty",
      note: "Satıcı kataloğunda bu aramaya uygun başlık bulunamadı",
    };
  } catch {
    return { titles: [], status: "error", note: "Trendyol satıcı API isteği başarısız" };
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

  if (trendyolPublic.status === "blocked") {
    notes.push(
      "Trendyol genel arama sunucudan engellendi (403). Tarayıcıdan yapılan aramalar çalışır; sunucu IP'si engellenir.",
    );
  }
  if (trendyolSeller.note) notes.push(trendyolSeller.note);

  const trendyol = [
    ...new Set([...trendyolPublic.titles, ...trendyolSeller.titles]),
  ].slice(0, 8);

  return {
    trendyol,
    hepsiburada: hepsiburada.titles,
    localStore,
    diagnostics: {
      trendyolPublic: trendyolPublic.status,
      trendyolSeller: trendyolSeller.status,
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
  if (!competitorTitles.length) return baseTitle;

  const tokens = new Map<string, number>();
  for (const t of competitorTitles) {
    for (const w of t.toLowerCase().split(/\s+/)) {
      if (w.length < 4) continue;
      if (/^\d+$/.test(w)) continue;
      tokens.set(w, (tokens.get(w) ?? 0) + 1);
    }
  }

  const frequent = [...tokens.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 3);

  let result = baseTitle.trim();
  for (const w of frequent) {
    if (result.length >= maxLen - 5) break;
    if (!result.toLowerCase().includes(w)) {
      const add = w.charAt(0).toUpperCase() + w.slice(1);
      if (result.length + add.length + 1 <= maxLen) result = `${result} ${add}`;
    }
  }
  return result.slice(0, maxLen);
}
