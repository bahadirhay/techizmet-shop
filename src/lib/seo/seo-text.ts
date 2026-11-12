/**
 * SEO başlık / açıklama metinlerini güvenli biçimde sığdırma — istemci + sunucu (saf fonksiyonlar).
 *
 * Kurallar:
 *  - Kelime ortasından asla kesilmez.
 *  - Marka eki ("… | Marka") ya tam yazılır ya hiç yazılmaz.
 *  - Açıklamalar mümkünse cümle sonunda biter; sonda asılı bağlaç / noktalama kalmaz.
 */

export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

/** Kesme sonrası sonda kalırsa anlamsız duran kelimeler */
const DANGLING_WORDS = new Set([
  "ve",
  "ile",
  "için",
  "veya",
  "ya",
  "da",
  "de",
  "bir",
  "bu",
  "vs",
  "vs.",
  "en",
  "the",
  "and",
  "or",
  "of",
  "for",
  "with",
  "%100",
]);

const TRAILING_PUNCT_RE = /[\s\-–—|:;,/&(·•]+$/u;

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Sonda asılı noktalama ve bağlaçları temizler */
export function stripDanglingTail(text: string): string {
  let out = text.trim();
  for (let i = 0; i < 6; i += 1) {
    const before = out;
    out = out.replace(/…+$/u, "").replace(TRAILING_PUNCT_RE, "").trim();
    const lastSpace = out.lastIndexOf(" ");
    const lastWord = (lastSpace >= 0 ? out.slice(lastSpace + 1) : out).toLocaleLowerCase("tr-TR");
    if (lastSpace > 0 && DANGLING_WORDS.has(lastWord)) {
      out = out.slice(0, lastSpace).trim();
    }
    if (out === before) break;
  }
  return out;
}

/** Kelime sınırında keser; sonda asılı kelime / noktalama bırakmaz. Üç nokta eklemez. */
export function cutAtWord(text: string, max: number): string {
  const t = normalizeSpaces(text);
  if (t.length <= max) return t;
  const window = t.slice(0, max + 1);
  const lastSpace = window.lastIndexOf(" ");
  const cut = lastSpace > 0 ? window.slice(0, lastSpace) : t.slice(0, max);
  return stripDanglingTail(cut);
}

/** "A? B", "A: B", "A - B", "A | B" gibi doğal bölünme noktalarında başlığın anlamlı ön eklerini döner */
function titleClausePrefixes(title: string): string[] {
  const out: string[] = [];
  const re = /[?!](?=\s)|\s[-–—|]\s|:\s/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(title))) {
    const keepsMark = m[0] === "?" || m[0] === "!";
    const end = keepsMark ? m.index + 1 : m.index;
    const prefix = title.slice(0, end).trim();
    if (prefix) out.push(prefix);
  }
  return out;
}

/**
 * Ana başlığı `max` karaktere sığdırır.
 * Önce doğal bölünme noktası (soru işareti, iki nokta, tire) denenir, yoksa kelime sınırı.
 */
export function shortenTitleMain(main: string, max: number): string {
  const t = normalizeSpaces(main);
  if (t.length <= max) return t;
  const minClause = Math.min(25, Math.floor(max * 0.4));
  const clause = titleClausePrefixes(t)
    .filter((p) => p.length <= max && p.length >= minClause)
    .sort((a, b) => b.length - a.length)[0];
  if (clause) return clause;
  return cutAtWord(t, max);
}

/**
 * "Ana başlık | Marka" — marka eki tam sığıyorsa eklenir, sığmıyorsa hiç eklenmez.
 * Ana başlık uzunsa anlamlı bir yerden kısaltılır ve ek yeniden denenir.
 */
export function fitSeoTitle(main: string, suffix?: string | null, max = SEO_TITLE_MAX): string {
  const m = normalizeSpaces(main);
  const s = normalizeSpaces(suffix ?? "");
  const withSuffix = (base: string) => (s ? `${base} | ${s}` : base);
  const alreadyHasSuffix =
    !s || m.toLocaleLowerCase("tr-TR").includes(s.toLocaleLowerCase("tr-TR"));

  if (!alreadyHasSuffix && withSuffix(m).length <= max) return withSuffix(m);
  if (m.length <= max) return m;

  const short = shortenTitleMain(m, max);
  if (!alreadyHasSuffix && withSuffix(short).length <= max) return withSuffix(short);
  return short;
}

/**
 * Hazır bir başlığı (ör. AI çıktısı) `max` karaktere indirir.
 * " | " ile ayrılmış sondaki ekler (marka, site) sığmıyorsa bütün olarak düşürülür.
 */
export function clampSeoTitle(title: string, max = SEO_TITLE_MAX): string {
  const t = stripDanglingTail(normalizeSpaces(title));
  if (t.length <= max) return t;
  const parts = t.split(/\s+\|\s+/).filter(Boolean);
  while (parts.length > 1) {
    parts.pop();
    const joined = parts.join(" | ");
    if (joined.length <= max) return stripDanglingTail(joined);
  }
  return shortenTitleMain(parts[0] ?? t, max);
}

/** Cümlelere böler (nokta / soru / ünlem + boşluk). Ondalık sayıları ve "%10." gibi yapıları bölmez. */
export function splitSentences(text: string): string[] {
  const t = normalizeSpaces(text);
  if (!t) return [];
  return t
    .split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}%"'“(])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function endsWithTerminal(text: string): boolean {
  return /[.!?]["'”)]?$/u.test(text.trim());
}

/**
 * Tek bir metni `max` karaktere sığdırır: önce tam cümle sınırı, olmazsa kelime sınırı.
 * `minSentenceLen` — cümle sınırında kesmek için kalan metnin en az uzunluğu.
 */
export function clampSeoDescription(
  text: string,
  max = SEO_DESCRIPTION_MAX,
  minSentenceLen = 70,
): string {
  const t = normalizeSpaces(text).replace(/…+$/u, "").trim();
  if (t.length <= max) return t;

  const sentences = splitSentences(t);
  let acc = "";
  for (const s of sentences) {
    const next = acc ? `${acc} ${s}` : s;
    if (next.length > max) break;
    acc = next;
  }
  if (acc.length >= minSentenceLen) return acc;
  return cutAtWord(t, max);
}

/**
 * Cümle parçalarını sırayla ekleyerek açıklama kurar; bir parça sığmıyorsa atlanır (yarım cümle olmaz).
 * `target` uzunluğa ulaşıldıktan sonra dolgu parçaları eklenmez.
 */
export function fitSeoDescription(
  parts: Array<string | null | undefined>,
  opts?: { max?: number; target?: number },
): string {
  const max = opts?.max ?? SEO_DESCRIPTION_MAX;
  const target = opts?.target ?? 120;
  const clean = parts.map((p) => normalizeSpaces(p ?? "")).filter(Boolean);
  if (!clean.length) return "";

  let out = clampSeoDescription(clean[0]!, max);
  for (const part of clean.slice(1)) {
    if (out.length >= target) break;
    const base = endsWithTerminal(out) ? out : `${out}.`;
    const next = `${base} ${part}`;
    if (next.length <= max) out = next;
  }
  return out;
}

/**
 * Kayıtlı (eski üreticiyle kesilmiş) başlığı onarır:
 *  - sondaki "…" kaldırılır,
 *  - " | Anatoli" gibi yarım marka eki tam markaya tamamlanır ya da düşürülür.
 */
export function repairStoredSeoTitle(
  stored: string,
  opts?: {
    /** Marka / site adı — yarım kalmış " | Marka" ekini tanımak için */
    brandName?: string | null;
    /** Sayfanın tam başlığı — kayıtlı değer bunun kesilmiş hâliyse yeniden kurulur */
    sourceTitle?: string | null;
    /**
     * Marka eki tam olsa bile ana kısım `sourceTitle`'ın kesilmiş hâliyse yeniden kur.
     * Yalnızca başlığı otomatik üretilen kayıtlarda (blog, sayfa) açılır; elle kısaltılmış
     * ürün başlıklarına dokunmamak için varsayılan kapalıdır.
     */
    rebuildTruncatedSource?: boolean;
    max?: number;
  },
): string {
  const max = opts?.max ?? SEO_TITLE_MAX;
  let t = normalizeSpaces(stored);
  if (!t) return t;
  const brand = normalizeSpaces(opts?.brandName ?? "");
  const source = normalizeSpaces(opts?.sourceTitle ?? "");
  const hadEllipsis = /…+$/u.test(t) || /\.{3}$/.test(t);
  if (hadEllipsis) t = t.replace(/(…+|\.{3})$/u, "").trim();

  const lower = (s: string) => s.toLocaleLowerCase("tr-TR");
  const isTruncationOfSource = (main: string) =>
    Boolean(source) && main.length < source.length && lower(source).startsWith(lower(main));

  const sepIndex = t.lastIndexOf(" | ");
  if (brand && sepIndex > 0) {
    const main = t.slice(0, sepIndex).trim();
    const tail = t.slice(sepIndex + 3).trim();
    const isFullBrand = lower(tail) === lower(brand);
    const isPartialBrand =
      tail.length > 0 && tail.length < brand.length && lower(brand).startsWith(lower(tail));
    if (isFullBrand || isPartialBrand) {
      const cleanMain = stripDanglingTail(main);
      const mayRebuild = isPartialBrand || cleanMain !== main || opts?.rebuildTruncatedSource;
      // Kayıtlı ana kısım tam başlığın kesilmiş hâli → tam başlıktan yeniden kur
      if (mayRebuild && isTruncationOfSource(main)) return fitSeoTitle(source, brand, max);
      if (isPartialBrand || cleanMain !== main) return fitSeoTitle(cleanMain, brand, max);
      return t;
    }
  }
  if (hadEllipsis) {
    if (isTruncationOfSource(t)) return fitSeoTitle(source, brand || null, max);
    return stripDanglingTail(t);
  }
  return t;
}

/**
 * Kayıtlı açıklama cümle ortasında kesilmişse son tam cümleye geri çeker.
 * Yalnızca kesilmiş görünen (üç nokta ile biten ya da karakter sınırına dayanmış) metinlere dokunur;
 * nokta ile bitmeyen kısa, elle yazılmış açıklamalar olduğu gibi kalır.
 */
export function repairStoredSeoDescription(stored: string, minLen = 70): string {
  const t = normalizeSpaces(stored);
  if (!t) return t;
  const withoutEllipsis = t.replace(/(…+|\.{3})$/u, "").trim();
  const hadEllipsis = withoutEllipsis !== t;
  if (!hadEllipsis && endsWithTerminal(t)) return t;
  if (!hadEllipsis && t.length < 150) return t;

  const sentences = splitSentences(withoutEllipsis);
  if (sentences.length > 1) {
    const complete = sentences.slice(0, -1).join(" ");
    if (complete.length >= minLen && endsWithTerminal(complete)) return complete;
  }
  return stripDanglingTail(withoutEllipsis);
}
