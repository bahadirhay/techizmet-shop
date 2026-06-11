/** Ürün adı bütünlüğü — SEO sırasında alakasız rakip/kategori kelimelerini engeller */

function queryTokens(query: string): string[] {
  return [...new Set(query.toLowerCase().split(/\s+/).filter((w) => w.length > 2))];
}

function scoreTitleMatch(title: string, tokens: string[]): number {
  const t = title.toLowerCase();
  return tokens.reduce((s, tok) => (t.includes(tok) ? s + 1 : s), 0);
}

const TITLE_STOP_WORDS = new Set([
  "ve",
  "ile",
  "için",
  "the",
  "and",
  "dog",
  "cat",
  "pet",
  "köpek",
  "kedi",
  "ödül",
  "ödülü",
  "mama",
  "snack",
  "treat",
  "doğal",
  "natural",
  "kurutulmuş",
  "dried",
  "taze",
  "premium",
  "organik",
  "organic",
  "gram",
  "gr",
  "kg",
  "paket",
  "adet",
  "li",
  "lu",
  "lı",
  "lü",
]);

/** Aynı gruptaki kelimeler uyumlu; farklı gruplar (dana vs tavuk) çakışır */
const INGREDIENT_GROUPS: RegExp[] = [
  /\b(dana|sığır|beef|biftek)\b/i,
  /\b(tavuk|chicken|piliç)\b/i,
  /\b(kuzu|lamb|koç)\b/i,
  /\b(balık|fish|somon|salmon|hamsi)\b/i,
  /\b(akciğer|ciğer|lung|liver|karaciğer)\b/i,
  /\b(ayağı|ayak|feet|pençe|pati)\b/i,
  /\b(tendon|bağırsak|işkembe|mide|kulak|deri|kemik|boynu|beyin|kalp)\b/i,
];

function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç]/gi, "")
    .trim();
}

export function extractIdentityTokens(title: string): string[] {
  return title
    .split(/\s+/)
    .map(normalizeToken)
    .filter((w) => w.length > 2 && !TITLE_STOP_WORDS.has(w));
}

function ingredientGroupsInText(text: string): Set<number> {
  const groups = new Set<number>();
  for (let i = 0; i < INGREDIENT_GROUPS.length; i++) {
    if (INGREDIENT_GROUPS[i]!.test(text)) groups.add(i);
  }
  return groups;
}

/** Kelime veya ifade ürün kimliğiyle çelişiyor mu (dana ürününe tavuk eklemek gibi) */
export function conflictsWithProductIdentity(baseTitle: string, fragment: string): boolean {
  const baseGroups = ingredientGroupsInText(baseTitle);
  if (!baseGroups.size) return false;

  const fragmentGroups = ingredientGroupsInText(fragment);
  if (!fragmentGroups.size) return false;

  for (const g of fragmentGroups) {
    if (!baseGroups.has(g)) return true;
  }
  return false;
}

export function filterRelevantCompetitorTitles(baseTitle: string, titles: string[]): string[] {
  const identity = extractIdentityTokens(baseTitle);
  const tokens = queryTokens(baseTitle);

  return titles.filter((raw) => {
    const t = raw.trim();
    if (t.length < 5) return false;
    if (conflictsWithProductIdentity(baseTitle, t)) return false;

    const score = scoreTitleMatch(t, tokens);
    if (score >= 2) return true;

    const lower = t.toLowerCase();
    const hits = identity.filter((id) => lower.includes(id)).length;
    return identity.length > 0 && hits >= Math.min(2, identity.length);
  });
}

export function sanitizeKeywordsForProduct(baseTitle: string, keywords: string[]): string[] {
  const identity = extractIdentityTokens(baseTitle);
  return keywords.filter((kw) => {
    const k = kw.trim().toLowerCase();
    if (!k) return false;
    if (conflictsWithProductIdentity(baseTitle, k)) return false;
    if (!identity.length) return true;
    return identity.some((id) => k.includes(id));
  });
}

export function safeRefineTitleFromCompetitors(
  baseTitle: string,
  competitorTitles: string[],
  maxLen = 100,
): string {
  const relevant = filterRelevantCompetitorTitles(baseTitle, competitorTitles);
  if (!relevant.length) return baseTitle.trim().slice(0, maxLen);

  const tokens = new Map<string, number>();
  for (const t of relevant) {
    for (const w of t.toLowerCase().split(/\s+/)) {
      const word = normalizeToken(w);
      if (word.length < 4) continue;
      if (TITLE_STOP_WORDS.has(word)) continue;
      if (/^\d+$/.test(word)) continue;
      if (conflictsWithProductIdentity(baseTitle, word)) continue;
      if (baseTitle.toLowerCase().includes(word)) continue;
      tokens.set(word, (tokens.get(word) ?? 0) + 1);
    }
  }

  const frequent = [...tokens.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 2);

  let result = baseTitle.trim();
  for (const w of frequent) {
    if (result.length >= maxLen - 5) break;
    const add = w.charAt(0).toUpperCase() + w.slice(1);
    if (result.length + add.length + 1 <= maxLen) result = `${result} ${add}`;
  }
  return result.slice(0, maxLen);
}
