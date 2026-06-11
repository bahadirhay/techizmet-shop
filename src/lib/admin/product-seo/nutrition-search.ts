import "server-only";

import {
  buildMarketplaceSearchQuery,
  marketplaceQueryTokens,
  scoreMarketplaceTitleMatch,
} from "@/lib/admin/product-seo/marketplace-search";
import { fetchTrendyolCompetitorPrices } from "@/lib/admin/product-pricing/marketplace-competitor-prices";

const FETCH_TIMEOUT_MS = 10000;

const BROWSER_HEADERS = {
  Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export type PetNutritionValues = {
  protein?: number;
  fat?: number;
  fiber?: number;
  moisture?: number;
  ash?: number;
};

export type PetNutritionAnalysis = PetNutritionValues & {
  source: "web" | "estimate" | "none";
  sourceNote?: string;
  referenceTitle?: string;
};

export type PetNutritionSearchResult = {
  nutrition: PetNutritionAnalysis;
  notes: string[];
};

type ParsedNutritionHit = PetNutritionValues & {
  score: number;
  title?: string;
};

function parsePercent(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 100) return undefined;
  return Math.round(n * 10) / 10;
}

function pickPercent(text: string, patterns: RegExp[]): number | undefined {
  const blob = text.replace(/\s+/g, " ");
  for (const re of patterns) {
    const m = blob.match(re);
    if (m?.[1]) {
      const v = parsePercent(m[1]);
      if (v != null) return v;
    }
  }
  return undefined;
}

/** HTML / açıklama metninden analitik bileşenleri çıkarır */
export function parseNutritionFromText(text: string): PetNutritionValues {
  if (!text.trim()) return {};

  return {
    protein: pickPercent(text, [
      /ham\s*protein[^0-9%]{0,24}([\d]+(?:[.,]\d+)?)\s*%/i,
      /protein[^0-9%]{0,18}([\d]+(?:[.,]\d+)?)\s*%/i,
      /"protein"\s*:\s*([\d]+(?:[.,]\d+)?)/i,
    ]),
    fat: pickPercent(text, [
      /ham\s*ya[ğg][^0-9%]{0,24}([\d]+(?:[.,]\d+)?)\s*%/i,
      /(?:toplam\s*)?ya[ğg][^0-9%]{0,18}([\d]+(?:[.,]\d+)?)\s*%/i,
      /"fat"\s*:\s*([\d]+(?:[.,]\d+)?)/i,
    ]),
    fiber: pickPercent(text, [
      /ham\s*sel[üu]loz[^0-9%]{0,24}([\d]+(?:[.,]\d+)?)\s*%/i,
      /(?:ham\s*)?(?:lif|sel[üu]loz)[^0-9%]{0,18}([\d]+(?:[.,]\d+)?)\s*%/i,
      /"fiber"\s*:\s*([\d]+(?:[.,]\d+)?)/i,
    ]),
    moisture: pickPercent(text, [
      /nem[^0-9%]{0,18}([\d]+(?:[.,]\d+)?)\s*%/i,
      /moisture[^0-9%]{0,18}([\d]+(?:[.,]\d+)?)\s*%/i,
      /"moisture"\s*:\s*([\d]+(?:[.,]\d+)?)/i,
    ]),
    ash: pickPercent(text, [
      /k[üu]l[^0-9%]{0,18}([\d]+(?:[.,]\d+)?)\s*%/i,
      /"ash"\s*:\s*([\d]+(?:[.,]\d+)?)/i,
    ]),
  };
}

function countNutritionFields(v: PetNutritionValues): number {
  return [v.protein, v.fat, v.fiber, v.moisture, v.ash].filter((x) => x != null).length;
}

function mergeNutritionHits(hits: ParsedNutritionHit[]): PetNutritionAnalysis {
  if (!hits.length) {
    return { source: "none" };
  }

  const fields = ["protein", "fat", "fiber", "moisture", "ash"] as const;
  const merged: PetNutritionValues = {};
  for (const field of fields) {
    const values = hits.map((h) => h[field]).filter((v): v is number => v != null);
    if (!values.length) continue;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    merged[field] = Math.round(avg * 10) / 10;
  }

  const best = [...hits].sort((a, b) => b.score - a.score || countNutritionFields(b) - countNutritionFields(a))[0]!;

  return {
    ...merged,
    source: "web",
    referenceTitle: best.title,
    sourceNote: `${hits.length} kaynaktan birleştirildi`,
  };
}

function estimateFromIngredient(title: string, categoryTitles: string[]): PetNutritionAnalysis | null {
  const blob = [title, ...categoryTitles].join(" ").toLowerCase();

  const profiles: { match: RegExp; values: PetNutritionValues; note: string }[] = [
    {
      match: /akci[ğg]er|ci[ğg]er|lung|liver/,
      values: { protein: 65, fat: 10, fiber: 1, moisture: 10, ash: 8 },
      note: "Kurutulmuş sakatat (akciğer/ciğer) — sektör ortalaması",
    },
    {
      match: /tendon|deri|kulak/,
      values: { protein: 85, fat: 5, fiber: 0, moisture: 8, ash: 4 },
      note: "Kurutulmuş tendon/deri — sektör ortalaması",
    },
    {
      match: /kemik|bone/,
      values: { protein: 28, fat: 12, fiber: 0, moisture: 15, ash: 45 },
      note: "Kemik ödülü — sektör ortalaması",
    },
    {
      match: /bal[ıi]k|fish|somon|salmon/,
      values: { protein: 62, fat: 8, fiber: 0, moisture: 12, ash: 7 },
      note: "Kurutulmuş balık — sektör ortalaması",
    },
    {
      match: /dana|sı[ğg][ıi]r|beef|kuzu|lamb|tavuk|chicken/,
      values: { protein: 58, fat: 15, fiber: 1, moisture: 12, ash: 7 },
      note: "Kurutulmuş et ödülü — sektör ortalaması",
    },
    {
      match: /köpek|kedi|pet|ödül|snack|treat|mama/,
      values: { protein: 55, fat: 14, fiber: 2, moisture: 12, ash: 7 },
      note: "Genel pet ödül maması — sektör ortalaması",
    },
  ];

  for (const profile of profiles) {
    if (profile.match.test(blob)) {
      return {
        ...profile.values,
        source: "estimate",
        sourceNote: profile.note,
      };
    }
  }
  return null;
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function extractHbProductUrls(html: string): string[] {
  const urls = new Set<string>();
  const patterns = [
    /href="(\/[^"]+-p-[0-9]+(?:\?[^"]*)?)"/gi,
    /"url"\s*:\s*"(https:\/\/www\.hepsiburada\.com\/[^"]+)"/gi,
    /"url"\s*:\s*"(\/[^"]+-p-[0-9]+)"/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && urls.size < 6) {
      const raw = m[1]!.trim();
      const url = raw.startsWith("http") ? raw : `https://www.hepsiburada.com${raw}`;
      urls.add(url.split("?")[0]!);
    }
  }
  return [...urls];
}

function nutritionFromHtml(html: string, title: string, query: string): ParsedNutritionHit | null {
  const parsed = parseNutritionFromText(html);
  if (countNutritionFields(parsed) < 2) return null;
  const tokens = marketplaceQueryTokens(query);
  return {
    ...parsed,
    score: scoreMarketplaceTitleMatch(title, tokens) + countNutritionFields(parsed) * 3,
    title,
  };
}

/** Trendyol + Hepsiburada aramasından besin değerleri */
export async function fetchPetNutritionFromWeb(input: {
  title: string;
  categoryTitle?: string;
  brandTitle?: string;
  categoryTitles?: string[];
}): Promise<PetNutritionSearchResult> {
  const query = buildMarketplaceSearchQuery(input.title, input.categoryTitle, input.brandTitle);
  const notes: string[] = [];
  const hits: ParsedNutritionHit[] = [];

  if (!query.trim()) {
    return { nutrition: { source: "none" }, notes: ["Arama sorgusu boş"] };
  }

  const [trendyolSearch, hbSearchHtml] = await Promise.all([
    fetchTrendyolCompetitorPrices(query),
    fetchPageText(`https://www.hepsiburada.com/ara?q=${encodeURIComponent(query)}`),
  ]);

  if (trendyolSearch.note) notes.push(trendyolSearch.note);

  if (hbSearchHtml) {
    const hbHit = nutritionFromHtml(hbSearchHtml, input.title, query);
    if (hbHit) hits.push(hbHit);
  }

  const detailFetches: Promise<void>[] = [];

  for (const item of trendyolSearch.items.slice(0, 4)) {
    if (!item.url) continue;
    detailFetches.push(
      fetchPageText(item.url).then((html) => {
        if (!html) return;
        const hit = nutritionFromHtml(html, item.title, query);
        if (hit) hits.push(hit);
      }),
    );
  }

  for (const url of extractHbProductUrls(hbSearchHtml).slice(0, 3)) {
    detailFetches.push(
      fetchPageText(url).then((html) => {
        if (!html) return;
        const hit = nutritionFromHtml(html, input.title, query);
        if (hit) hits.push({ ...hit, score: hit.score + 2 });
      }),
    );
  }

  await Promise.all(detailFetches);

  let nutrition = mergeNutritionHits(hits);
  if (nutrition.source === "web") {
    notes.push(
      nutrition.referenceTitle
        ? `Besin değerleri web'den: "${nutrition.referenceTitle}"`
        : "Besin değerleri pazaryeri açıklamalarından çıkarıldı",
    );
    return { nutrition, notes };
  }

  const estimate = estimateFromIngredient(input.title, input.categoryTitles ?? []);
  if (estimate) {
    notes.push(`Web'de analiz tablosu bulunamadı — ${estimate.sourceNote}`);
    return { nutrition: estimate, notes };
  }

  notes.push("Besin değerleri bulunamadı");
  return { nutrition: { source: "none" }, notes };
}

export function formatNutritionLines(nutrition: PetNutritionAnalysis): string[] {
  const lines: string[] = [];
  if (nutrition.protein != null) lines.push(`  • Ham protein: ${nutrition.protein} %`);
  if (nutrition.fat != null) lines.push(`  • Ham yağ: ${nutrition.fat} %`);
  if (nutrition.fiber != null) lines.push(`  • Ham selüloz (lif): ${nutrition.fiber} %`);
  if (nutrition.moisture != null) lines.push(`  • Nem: ${nutrition.moisture} %`);
  if (nutrition.ash != null) lines.push(`  • Kül: ${nutrition.ash} %`);
  return lines;
}

export function buildPetNutritionKeyFeaturesBlock(input: {
  title: string;
  brandTitle?: string;
  siteName: string;
  nutrition: PetNutritionAnalysis | null;
}): string {
  const brand = input.brandTitle?.trim();
  const lines = [
    `- %100 doğal / minimal işlem — ${input.title}`,
    `- Besin Değerleri (analitik bileşenler):`,
  ];

  const nutritionLines = input.nutrition ? formatNutritionLines(input.nutrition) : [];
  if (nutritionLines.length >= 3) {
    lines.push(...nutritionLines);
    if (input.nutrition?.source === "web") {
      lines.push(`- Kaynak: pazaryeri / üretici analiz tablosu${input.nutrition.referenceTitle ? ` (${input.nutrition.referenceTitle})` : ""}`);
    } else if (input.nutrition?.source === "estimate") {
      lines.push(`- Not: ${input.nutrition.sourceNote ?? "Tahmini değerler — etiketinize göre doğrulayın"}`);
    }
  } else {
    lines.push(`  • Ham protein: … %`);
    lines.push(`  • Ham yağ: … %`);
    lines.push(`  • Ham selüloz (lif): … %`);
    lines.push(`  • Nem: … %`);
    lines.push(`  • Kül: … %`);
    lines.push(`- Besin tablosu bulunamadı — üretici etiketine göre güncelleyin`);
  }

  lines.push(
    `- Katkı maddesi, renklendirici veya koruyucu içermez (ürününüze göre düzenleyin)`,
    `- Eğitim ödülü ve pozitif pekiştirme için ideal boyut`,
    `- Hava almayan ambalajda tazelik korunur`,
    brand ? `- ${brand} marka güvencesi` : `- ${input.siteName} kalite kontrolü`,
  );

  return lines.join("\n");
}
