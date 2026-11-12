import {
  clampSeoDescription,
  clampSeoTitle,
  cutAtWord,
  fitSeoDescription,
  fitSeoTitle,
  splitSentences,
} from "@/lib/seo/seo-text";

const SEO_DESC_MIN = 70;
const SEO_DESC_MAX = 160;
const SEO_TITLE_MIN = 25;
const SEO_TITLE_MAX = 65;

const KIND_PHRASES: Record<string, string> = {
  collections: "Tüm ürün koleksiyonlarını keşfedin.",
  collection: "Bu koleksiyondaki ürünleri inceleyin.",
  category: "Kategori ürünlerini filtreleyerek bulun.",
  cms: "Sayfa içeriği ve mağaza politikaları hakkında bilgi alın.",
  "blog-list": "Blog yazıları, ipuçları ve güncel haberler.",
  "blog-post": "Blog yazısını okuyun.",
};

const SHORT_DESC_SUFFIX = "Güvenli ödeme, hızlı teslimat ve kolay iade imkânı.";
const SHORT_DESC_EXTRA = "Resmi mağazamızdan güvenle sipariş verin.";

function storeBoilerplate(page: string, site: string): string {
  return `${page} — ${site} resmi mağazasında güvenli alışveriş, hızlı kargo ve kolay iade.`;
}

export function ensureSeoDescriptionLength(text: string, min = SEO_DESC_MIN): string {
  const out = text.trim().replace(/\s+/g, " ");
  if (out.length >= min) return clampSeoDescription(out, SEO_DESC_MAX);
  // Kısa açıklama — tam cümlelerle tamamla (cümle ortasında bitmez)
  return fitSeoDescription([out, SHORT_DESC_SUFFIX, SHORT_DESC_EXTRA], {
    max: SEO_DESC_MAX,
    target: min,
  });
}

export function ensureSeoTitleLength(title: string, siteName: string): string {
  let out = title.trim().replace(/\s+/g, " ");
  if (out.length >= SEO_TITLE_MIN && out.length <= SEO_TITLE_MAX) return out;

  if (out.length < SEO_TITLE_MIN) {
    out = buildSitePageSeoTitle(out, siteName);
  }
  if (out.length > SEO_TITLE_MAX) {
    // " | Site" eki sığmıyorsa bütün olarak düşer; ana başlık kelime sınırında kısalır
    out = clampSeoTitle(out, SEO_TITLE_MAX);
  }
  return out;
}

export function buildSitePageSeoTitle(pageTitle: string, siteName: string, maxLen = SEO_TITLE_MAX): string {
  const page = pageTitle.trim().replace(/\s+/g, " ");
  const site = siteName.trim();
  const withSite = `${page} | ${site}`;
  if (withSite.length >= SEO_TITLE_MIN && withSite.length <= maxLen) return withSite;
  if (withSite.length < SEO_TITLE_MIN) {
    const extended = `${page} — Online Mağaza | ${site}`;
    if (extended.length <= maxLen) return extended;
  }
  // " | Site" eki ya tam yazılır ya hiç; uzun başlık kelime / cümlecik sınırında kısaltılır
  return fitSeoTitle(page, site, maxLen);
}

/** Ana sayfa meta başlığı — ürün/hizmet odaklı; marka adı yalnızca sonda bir kez */
export function buildHomeSeoTitle(siteName: string, metaDescription?: string): string {
  const desc = metaDescription?.trim() ?? "";
  const site = siteName.trim();

  if (/köpek\s*ödül|ödül\s*maması|dog\s*treat|freeze.?dried/i.test(desc)) {
    const productPhrase =
      desc.match(/%?\d*\s*doğal\s+kurutulmuş\s+köpek\s+ödül\s+mamaları/i)?.[0] ??
      desc.match(/doğal\s+köpek\s+ödül\s+mamaları/i)?.[0] ??
      "Doğal Köpek Ödül Mamaları";
    return ensureSeoTitleLength(`${productPhrase} | ${site}`, site);
  }

  if (desc.length >= 30) {
    const hook = cutAtWord(desc.split(/[.!?]/)[0]?.trim() ?? desc, 38);
    if (hook.length >= 18) {
      return ensureSeoTitleLength(`${hook} | ${site}`, site);
    }
  }

  return ensureSeoTitleLength(`Doğal Ürünler ve Online Alışveriş | ${site}`, site);
}

/**
 * Önceki SEO çalışmasının eklediği dolgu cümlelerini ve kesilmiş kuyruğu ayıklar.
 * Aksi halde her çalıştırmada eski çıktı yeniden "ipucu" olur ve sona anlamsız kelimeler birikir
 * ("… güvenli Blog Blog").
 */
export function stripGeneratedSeoBoilerplate(
  hint: string,
  ctx: { pageTitle: string; siteName: string },
): string {
  const text = hint.trim().replace(/\s+/g, " ");
  if (!text) return "";
  const lower = (s: string) => s.toLocaleLowerCase("tr-TR");
  const page = lower(ctx.pageTitle.trim());
  const site = lower(ctx.siteName.trim());
  const kindPhrases = new Set(Object.values(KIND_PHRASES).map(lower));
  const fillers = new Set([lower(SHORT_DESC_SUFFIX), lower(SHORT_DESC_EXTRA)]);
  const boilerStart = lower(`${ctx.pageTitle.trim()} — ${ctx.siteName.trim()}`);

  const sentences = splitSentences(text);
  const looksTruncated = text.length >= 140;
  const kept: string[] = [];

  sentences.forEach((sentence, index) => {
    const s = lower(sentence);
    const isLast = index === sentences.length - 1;
    const terminated = /[.!?]["'”)]?$/u.test(sentence);

    if (kindPhrases.has(s) || fillers.has(s)) return;
    if (s.startsWith(boilerStart)) return;
    // Kesilmiş dolgu cümlesi başlangıcı ("Sayfa içeriği ve mağaza politikaları hakkında bilgi")
    if (!terminated && [...kindPhrases, ...fillers].some((p) => p.startsWith(s))) return;

    if (isLast && !terminated && kept.length > 0) {
      const words = s.split(" ").filter(Boolean);
      // Sona birikmiş tekrar kelimeler: "Blog Blog", "Sayfa Sayfa", "Köpek"
      const onlyKnownWords = words.every(
        (w) => page.split(" ").includes(w) || site.split(" ").includes(w) || w === "sayfa" || w === "blog",
      );
      if (onlyKnownWords || words.length <= 3 || looksTruncated) return;
    }
    kept.push(sentence);
  });

  return kept.join(" ").trim();
}

export function buildSitePageSeoDescription(input: {
  pageTitle: string;
  siteName: string;
  hint?: string;
  fallback?: string;
  kind?: string;
}): string {
  const page = input.pageTitle.trim();
  const site = input.siteName.trim();
  const rawHint = input.hint?.trim() || input.fallback?.trim() || "";
  const hint = stripGeneratedSeoBoilerplate(rawHint, { pageTitle: page, siteName: site });

  // Parçalar tam cümledir; sığmayan parça atlanır, böylece açıklama cümle ortasında bitmez.
  const result = fitSeoDescription(
    [hint.length >= 40 ? hint : null, KIND_PHRASES[input.kind ?? ""] ?? null, storeBoilerplate(page, site)],
    { max: SEO_DESC_MAX, target: 120 },
  );
  return ensureSeoDescriptionLength(result);
}

export function buildImageAltText(pageTitle: string, siteName: string): string {
  return cutAtWord(`${pageTitle.trim()} — ${siteName.trim()}`, 125);
}

export function buildHomeSeoDescription(siteName: string, metaDescription?: string): string {
  const custom = metaDescription?.trim();
  if (custom && custom.length >= SEO_DESC_MIN) {
    return ensureSeoDescriptionLength(custom);
  }
  return ensureSeoDescriptionLength(
    `${siteName} — doğal ürünler, güvenilir içerik ve hızlı teslimat. Online mağazamızdan güvenle sipariş verin.`,
  );
}
