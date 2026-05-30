const SUGGEST_TIMEOUT_MS = 6000;

/** Google arama önerileri (ücretsiz, API anahtarı gerekmez) */
export async function fetchGoogleSuggestions(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=tr&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(SUGGEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const text = await res.text();
    const jsonStart = text.indexOf("[");
    if (jsonStart < 0) return [];
    const data = JSON.parse(text.slice(jsonStart)) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
    const items = data[1] as unknown[];
    return items
      .map((item) => {
        if (typeof item === "string") return item;
        if (Array.isArray(item) && typeof item[0] === "string") return item[0];
        return null;
      })
      .filter((s): s is string => Boolean(s?.trim()))
      .slice(0, 8);
  } catch {
    return [];
  }
}

export async function collectKeywordSuggestions(input: {
  title: string;
  categoryTitles: string[];
  brandTitle?: string;
}): Promise<string[]> {
  const queries = new Set<string>();
  const cat = input.categoryTitles[0]?.trim();
  const brand = input.brandTitle?.trim();
  const title = input.title.trim();

  if (cat && title) queries.add(`${cat} ${title}`);
  if (cat && brand) queries.add(`${brand} ${cat}`);
  if (title) queries.add(title);
  if (cat) queries.add(cat);

  const words = title.split(/\s+/).filter((w) => w.length > 2);
  if (cat && words[0]) queries.add(`${cat} ${words[0]}`);

  const results = await Promise.all([...queries].slice(0, 4).map((q) => fetchGoogleSuggestions(q)));
  const merged = new Set<string>();
  for (const list of results) {
    for (const s of list) merged.add(s.toLowerCase());
  }
  return [...merged].slice(0, 12);
}
