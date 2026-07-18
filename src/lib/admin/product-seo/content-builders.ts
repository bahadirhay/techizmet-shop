/** SEO meta ve şablon metin — istemci + sunucu (server-only değil) */

import { getPrimaryGoogleIntents } from "@/lib/seo/search-intent";

export function truncateSeoText(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

export function normalizeProductTitle(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function containsWord(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(haystack);
}

/** Ürün açıklamasında zorunlu Google hedef ifadeleri (tam geçmeli) */
export function getProductDescriptionPrimaryPhrases(): string[] {
  return getPrimaryGoogleIntents().map((i) => i.query);
}

export function findMissingPrimaryPhrases(text: string): string[] {
  const hay = text.toLocaleLowerCase("tr-TR");
  return getProductDescriptionPrimaryPhrases().filter((phrase) => {
    const needle = phrase.toLocaleLowerCase("tr-TR");
    return !hay.includes(needle);
  });
}

/**
 * Profesyonel pet ürün açıklaması — web + pazaryeri.
 * "Köpek Ödül Maması", "Ödül maması", "Doğal Köpek Ödül Maması" ifadeleri zorunlu geçer.
 */
export function buildProfessionalPetProductDescription(input: {
  productTitle: string;
  brandTitle?: string;
  categoryTitles: string[];
  siteName: string;
}): string {
  const brand = input.brandTitle?.trim();
  const title = normalizeProductTitle(input.productTitle);
  const name =
    brand && !title.toLocaleLowerCase("tr-TR").includes(brand.toLocaleLowerCase("tr-TR"))
      ? `${brand} ${title}`
      : title;
  const cat = input.categoryTitles[0]?.trim() || "doğal köpek ödülleri";

  const paragraph1 =
    `${name}; köpek ödül maması olarak eğitim, ödüllendirme ve kontrollü atıştırmalık ihtiyacı için ` +
    `%100 doğal yaklaşımla hazırlanmış bir üründür. ${cat} kategorisinde, tahılsız ve katkısız formülüyle ` +
    `besin değerlerini koruyan uzun ömürlü bir çiğneme / ödül seçeneğidir.`;

  const paragraph2 =
    `Bu ödül maması; günlük rasyonun en fazla %10'u kadar küçük porsiyonlarda verilir, ana mama yerine geçmez. ` +
    `Doğal köpek ödül maması arayanlar için kısa içerik listesi, şeffaf üretim ve güvenilir protein ` +
    `kaynağı önceliğidir — ${input.siteName} mağazası ve bağlı pazaryeri listelerinde aynı kalite standardıyla sunulur.`;

  const paragraph3 =
    `Saklama: serin, kuru ve ışık almayan ortamda; açıldıktan sonra hava almayan kapta muhafaza edin. ` +
    `Yavru, yaşlı veya özel diyetteki köpeklerde veterinere danışın.`;

  return [paragraph1, paragraph2, paragraph3].join(" ");
}

/** Eksik hedef ifadeleri doğal bir cümleyle tamamlar (AI çıktısı için güvenlik ağı) */
export function ensurePrimaryPhrasesInDescription(description: string, siteName: string): string {
  const missing = findMissingPrimaryPhrases(description);
  if (!missing.length) return description.trim();

  const bridge =
    missing.length === 3
      ? `Bu ürün köpek ödül maması ve ödül maması kategorisinde doğal köpek ödül maması standardıyla ${siteName} güvencesinde sunulur.`
      : missing.includes("doğal köpek ödül maması") && missing.length === 1
        ? `Doğal köpek ödül maması arayanlar için katkısız ve tahılsız bir seçenektir.`
        : `Ürün; ${missing.join(", ")} aramalarında öne çıkacak şekilde konumlandırılmıştır.`;

  return `${description.trim()} ${bridge}`.trim();
}

export function buildProductSeoTitle(
  rawProductTitle: string,
  brandTitle: string | undefined,
  siteName: string,
  maxLen = 60,
): string {
  let product = normalizeProductTitle(rawProductTitle);
  const brand = brandTitle?.trim();
  const site = siteName.trim();

  if (brand && product.toLowerCase().startsWith(`${brand.toLowerCase()} `)) {
    product = product.slice(brand.length).trim();
  }

  const segments: string[] = [product];
  if (brand && !containsWord(product, brand)) segments.push(brand);
  segments.push(site);

  const full = segments.join(" | ");
  if (full.length <= maxLen) return full;

  if (brand && !containsWord(product, brand)) {
    const productBrand = `${product} | ${brand}`;
    if (productBrand.length <= maxLen) return productBrand;
    return truncateSeoText(productBrand, maxLen).replace(/…$/, "");
  }

  return truncateSeoText(product, maxLen).replace(/…$/, "");
}

export function buildProductSeoDescription(input: {
  productTitle: string;
  categoryTitles: string[];
  brandTitle?: string;
  description?: string;
  keywords?: string[];
  siteName: string;
}): string {
  const brand = input.brandTitle?.trim();
  const name = brand ? `${brand} ${input.productTitle}` : input.productTitle;
  const pet = isPetFoodContext(input.productTitle, input.categoryTitles);

  if (pet) {
    return truncateSeoText(
      `${name} — doğal köpek ödül maması ve köpek ödül maması. Tahılsız ödül maması; eğitim ve günlük ödül için. ${input.siteName}'da hızlı kargo.`,
      160,
    ).replace(/…$/, "");
  }

  const cat = input.categoryTitles.filter(Boolean).join(", ") || "ürün";
  const descSnippet = (input.description ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);

  const kwPhrase = (input.keywords ?? [])
    .filter((k) => k.length > 4 && !k.includes(input.productTitle.toLowerCase()))
    .slice(0, 3)
    .join(", ");

  const parts = [
    `${name} — ${cat} kategorisinde güvenilir seçim.`,
    descSnippet || `${input.siteName} üzerinden hızlı kargo ve güvenli ödeme.`,
    kwPhrase ? `${kwPhrase} arayanlar için.` : "",
    "Detaylı içerik, besin bilgisi ve kullanım önerileri ürün sayfasında.",
  ].filter(Boolean);

  let result = truncateSeoText(parts.join(" "), 160).replace(/…$/, "");
  if (result.length < 70) {
    result = truncateSeoText(
      `${name}. ${input.siteName}'da ${cat} ürünleri — hızlı teslimat, kolay iade.`,
      160,
    ).replace(/…$/, "");
  }
  return result;
}

const PET_FOOD_HINTS =
  /köpek|kedi|pet|mama|ödül|snack|treat|akciğer|ciğer|tendon|kemik|besin|gda|yavru|kuş/i;

export function isPetFoodContext(title: string, categoryTitles: string[]): boolean {
  const blob = [title, ...categoryTitles].join(" ");
  return PET_FOOD_HINTS.test(blob);
}

export function buildQuickSeoDefaults(input: {
  title: string;
  brandTitle?: string;
  siteName: string;
  categoryTitles: string[];
  description?: string;
}): { seoTitle: string; seoDescription: string } {
  const title = normalizeProductTitle(input.title);
  const keywords = title
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  return {
    seoTitle: buildProductSeoTitle(title, input.brandTitle, input.siteName),
    seoDescription: buildProductSeoDescription({
      productTitle: title,
      categoryTitles: input.categoryTitles,
      brandTitle: input.brandTitle,
      description: input.description,
      keywords,
      siteName: input.siteName,
    }),
  };
}
