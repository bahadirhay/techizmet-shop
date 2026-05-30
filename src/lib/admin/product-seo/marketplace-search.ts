const FETCH_TIMEOUT_MS = 8000;

const BROWSER_HEADERS = {
  Accept: "application/json, text/html;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

function buildQuery(title: string, categoryTitle?: string, brandTitle?: string): string {
  const parts = [brandTitle, categoryTitle, title].filter(Boolean);
  return parts.join(" ").trim().slice(0, 120);
}

/** Trendyol halka açık arama — satıcı API anahtarı gerekmez */
export async function fetchTrendyolCompetitorTitles(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];

  const urls = [
    `https://apigw.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?q=${encodeURIComponent(q)}&pi=1&culture=tr-TR&storefrontId=1&countryCode=TR`,
    `https://public.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?q=${encodeURIComponent(q)}&pi=1&culture=tr-TR&storefrontId=1&countryCode=TR`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        cache: "no-store",
      });
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
      if (titles.length) return titles;
    } catch {
      /* sonraki URL */
    }
  }

  return [];
}

/** Hepsiburada halka açık arama sayfası — API anahtarı gerekmez */
export async function fetchHepsiburadaCompetitorTitles(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await fetch(`https://www.hepsiburada.com/ara?q=${encodeURIComponent(q)}`, {
      headers: { ...BROWSER_HEADERS, Accept: "text/html" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return [];
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
    return [...titles].slice(0, 8);
  } catch {
    return [];
  }
}

export async function fetchMarketplaceCompetitorTitles(input: {
  title: string;
  categoryTitle?: string;
  brandTitle?: string;
}): Promise<{ trendyol: string[]; hepsiburada: string[] }> {
  const query = buildQuery(input.title, input.categoryTitle, input.brandTitle);
  const [trendyol, hepsiburada] = await Promise.all([
    fetchTrendyolCompetitorTitles(query),
    fetchHepsiburadaCompetitorTitles(query),
  ]);
  return { trendyol, hepsiburada };
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
