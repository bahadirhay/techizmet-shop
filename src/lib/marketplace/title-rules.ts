import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";

/** Marka bilgisinin başlık metnine nasıl yansıyacağı */
export type MarketplaceTitleBrandMode =
  /** brandId / Marka alanı ayrı — listede marka zaten görünür (Trendyol, Amazon) */
  | "separate_field"
  /** Ürün adı metninde marka ile başlamalı (Hepsiburada, n11) */
  | "prefix_in_title";

export type MarketplaceTitleRule = {
  id: string;
  label: string;
  maxLength: number;
  displayIdealMax: number;
  brandMode: MarketplaceTitleBrandMode;
  note: string;
};

/**
 * Pazaryeri başlık kuralları (API dokümantasyonu + satıcı paneli pratikleri).
 * @see https://developers.trendyol.com — title + brandId ayrı alanlar
 * @see https://developers.hepsiburada.com — UrunAdi marka ile başlamalı
 */
export const MARKETPLACE_TITLE_RULES: Record<string, MarketplaceTitleRule> = {
  trendyol: {
    id: "trendyol",
    label: "Trendyol",
    maxLength: 100,
    displayIdealMax: 90,
    brandMode: "separate_field",
    note: "brandId ayrı gönderilir; arayüzde marka zaten üstte — başlıkta tekrarlamayın",
  },
  hepsiburada: {
    id: "hepsiburada",
    label: "Hepsiburada",
    maxLength: 150,
    displayIdealMax: 80,
    brandMode: "prefix_in_title",
    note: "Marka + ana ürün adı + model/özellik; Marka alanı da doldurulur",
  },
  n11: {
    id: "n11",
    label: "n11",
    maxLength: 65,
    displayIdealMax: 55,
    brandMode: "prefix_in_title",
    note: "Kısa başlık; marka önde, özel karakter/ünlem sınırlı",
  },
  amazon_tr: {
    id: "amazon_tr",
    label: "Amazon.com.tr",
    maxLength: 200,
    displayIdealMax: 150,
    brandMode: "separate_field",
    note: "Marka ayrı alan; başlık özellik ve anahtar kelime odaklı",
  },
  ciceksepeti: {
    id: "ciceksepeti",
    label: "Çiçeksepeti",
    maxLength: 100,
    displayIdealMax: 80,
    brandMode: "prefix_in_title",
    note: "Marka + ürün + özellik",
  },
  pazarama: {
    id: "pazarama",
    label: "Pazarama",
    maxLength: 100,
    displayIdealMax: 90,
    brandMode: "separate_field",
    note: "Trendyol benzeri — marka ayrı alan",
  },
};

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

export function normalizeProductTitle(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function containsWord(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(haystack);
}

/** Başlıktaki marka önekini kaldırır — çift marka ve karakter israfını önler */
export function stripBrandFromTitle(title: string, brand?: string): string {
  let t = normalizeProductTitle(title);
  const b = brand?.trim();
  if (!b) return t;

  const patterns = [
    new RegExp(`^${escapeRegex(b)}\\s+`, "i"),
    new RegExp(`^${escapeRegex(b)}-\\s*`, "i"),
    new RegExp(`^${escapeRegex(b)}\\s*\\|\\s*`, "i"),
  ];
  for (const re of patterns) {
    if (re.test(t)) {
      t = t.replace(re, "").trim();
      break;
    }
  }
  return t;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Hepsiburada / n11 — marka başlık metninde olmalı */
export function ensureBrandPrefix(title: string, brand?: string): string {
  const t = normalizeProductTitle(title);
  const b = brand?.trim();
  if (!b || containsWord(t, b)) return t;
  return `${b} ${t}`;
}

/**
 * Başlıkta geçmeyen ama önemli olan anahtar kelimeleri otomatik ekler.
 * Sıralama: hayvan türü → ürün tipi → nitelik → gramaj/adet
 */
function injectMissingKeywords(
  title: string,
  keywords: string[],
  weightGrams?: number,
  pieceCount?: number,
): string {
  let t = title;
  const kws = keywords.map((k) => k.toLowerCase());

  // ── Hayvan türü ──────────────────────────────────────────────
  const hasPet = /köpek|kedi|kuş|balık|kemirgen|dog|cat|pet/i.test(t);
  if (!hasPet) {
    if (kws.some((k) => /köpek|dog/i.test(k))) t = `${t} Köpek`;
    else if (kws.some((k) => /kedi|cat/i.test(k))) t = `${t} Kedi`;
  }

  // ── Ürün tipi ─────────────────────────────────────────────────
  const hasTreatType = /ödül|ödüllük|çiğneme|atıştırmalık|mama|treat|chew/i.test(t);
  if (!hasTreatType) {
    if (kws.some((k) => /çiğneme|chew/i.test(k))) t = `${t} Çiğneme Ödülü`;
    else if (kws.some((k) => /ödül|treat/i.test(k))) t = `${t} Ödül`;
  }

  // ── Doğal / katkısız ─────────────────────────────────────────
  const hasNatural = /doğal|natural|organik|organic/i.test(t);
  if (!hasNatural && kws.some((k) => /doğal|natural/i.test(k))) {
    t = `${t} %100 Doğal`;
  }

  const hasAdditiveFree = /katkısız|katkı maddesi|additive/i.test(t);
  if (!hasAdditiveFree && kws.some((k) => /katkısız/i.test(k))) {
    t = `${t} Katkısız`;
  }

  // ── Gramaj ───────────────────────────────────────────────────
  const hasWeight = /\d+\s*g\b|\d+\s*gr\b|\d+\s*gram/i.test(t);
  if (!hasWeight && weightGrams && weightGrams > 0) {
    t = `${t} ${weightGrams}g`;
  }

  // ── Adet / Paket ─────────────────────────────────────────────
  const hasPiece = /\d+\s*(adet|'?li paket|'?lü paket|li|lü|lu|piece|pcs|pack)/i.test(t);
  if (!hasPiece && pieceCount && pieceCount > 1) {
    t = `${t} ${pieceCount}'li Paket`;
  }

  return t.trim();
}

export type BuildTitleOptions = {
  categoryTitles?: string[];
  keywords?: string[];
  /** Net ürün ağırlığı (gram) — başlıkta gramaj yoksa otomatik eklenir */
  weightGrams?: number;
  /** Paketteki adet — başlıkta belirtilmemişse "X'li Paket" eklenir */
  pieceCount?: number;
};

/**
 * Mağaza + Trendyol için kanonik ürün adı: marka öneksiz, açıklayıcı.
 * Eksik önemli anahtar kelimeler (doğal, katkısız, köpek, gramaj) otomatik eklenir.
 */
export function buildCanonicalProductTitle(
  rawTitle: string,
  brand?: string,
  categoryTitlesOrOptions: string[] | BuildTitleOptions = [],
  keywordsOrUndefined: string[] = [],
): string {
  // Geriye dönük uyumluluk: eski imza (rawTitle, brand, categoryTitles[], keywords[])
  const opts: BuildTitleOptions =
    Array.isArray(categoryTitlesOrOptions)
      ? { categoryTitles: categoryTitlesOrOptions, keywords: keywordsOrUndefined }
      : categoryTitlesOrOptions;

  const categoryTitles = opts.categoryTitles ?? [];
  const keywords = opts.keywords ?? [];
  const weightGrams = opts.weightGrams;
  const pieceCount = opts.pieceCount;

  let t = stripBrandFromTitle(rawTitle, brand);

  // Kategori ve keyword'lerden yardımcı terim listesi oluştur
  const allHints = [
    ...keywords,
    ...categoryTitles.flatMap((c) => c.split(/[\s,/|]+/)),
  ].filter(Boolean);

  t = injectMissingKeywords(t, allHints, weightGrams, pieceCount);

  return truncate(t, 100).replace(/…$/, "");
}

/** Platforma göre listeleme başlığı */
export function buildPlatformListingTitle(
  platform: string,
  rawTitle: string,
  brand?: string,
  options?: BuildTitleOptions,
): string {
  const rule = MARKETPLACE_TITLE_RULES[platform];
  const canonical = buildCanonicalProductTitle(rawTitle, brand, options ?? {});

  if (!rule) return truncate(canonical, 100);

  const titled =
    rule.brandMode === "prefix_in_title" ? ensureBrandPrefix(canonical, brand) : canonical;

  return truncate(titled, rule.maxLength).replace(/…$/, "");
}

export function buildAllPlatformListingTitles(
  rawTitle: string,
  brand?: string,
  options?: BuildTitleOptions,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of MARKETPLACE_PLATFORMS) {
    out[p.id] = buildPlatformListingTitle(p.id, rawTitle, brand, options);
  }
  return out;
}
