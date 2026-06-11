/** SEO meta ve şablon metin — istemci + sunucu (server-only değil) */

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
  const cat = input.categoryTitles.filter(Boolean).join(", ") || "ürün";
  const brand = input.brandTitle?.trim();
  const descSnippet = (input.description ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);

  const kwPhrase = (input.keywords ?? [])
    .filter((k) => k.length > 4 && !k.includes(input.productTitle.toLowerCase()))
    .slice(0, 3)
    .join(", ");

  const name = brand ? `${brand} ${input.productTitle}` : input.productTitle;
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
