import { truncateSeoText } from "@/lib/admin/product-seo/content-builders";

const SEO_DESC_MIN = 70;
const SEO_TITLE_MIN = 25;
const SEO_TITLE_MAX = 65;

export function ensureSeoDescriptionLength(text: string, min = SEO_DESC_MIN): string {
  let out = text.trim().replace(/\s+/g, " ");
  if (out.length >= min) {
    return truncateSeoText(out, 160).replace(/…$/, "");
  }
  const suffix = " Güvenli ödeme, hızlı teslimat ve kolay iade imkânı.";
  out = `${out}${out.endsWith(".") ? "" : "."}${suffix}`;
  if (out.length < min) {
    out = `${out} ${"Resmi mağazamızdan güvenle sipariş verin.".repeat(2)}`;
  }
  return truncateSeoText(out, 160).replace(/…$/, "");
}

export function ensureSeoTitleLength(title: string, siteName: string): string {
  let out = title.trim();
  if (out.length >= SEO_TITLE_MIN && out.length <= SEO_TITLE_MAX) return out;

  if (out.length < SEO_TITLE_MIN) {
    out = buildSitePageSeoTitle(out, siteName);
  }
  if (out.length < SEO_TITLE_MIN) {
    out = `${out} | ${siteName}`.slice(0, SEO_TITLE_MAX);
  }
  if (out.length > SEO_TITLE_MAX) {
    out = truncateSeoText(out, SEO_TITLE_MAX).replace(/…$/, "");
  }
  return out;
}

export function buildSitePageSeoTitle(pageTitle: string, siteName: string, maxLen = SEO_TITLE_MAX): string {
  const page = pageTitle.trim();
  const site = siteName.trim();
  const withSite = `${page} | ${site}`;
  if (withSite.length >= SEO_TITLE_MIN && withSite.length <= maxLen) return withSite;
  if (withSite.length < SEO_TITLE_MIN) {
    const extended = `${page} — Online Mağaza | ${site}`;
    if (extended.length <= maxLen) return extended;
  }
  if (withSite.length <= maxLen) return withSite;
  const pageOnly = truncateSeoText(page, maxLen - site.length - 3).replace(/…$/, "");
  return ensureSeoTitleLength(`${pageOnly} | ${site}`, site);
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
    const hook = truncateSeoText(desc.split(/[.!?]/)[0]?.trim() ?? desc, 38).replace(/…$/, "");
    if (hook.length >= 18) {
      return ensureSeoTitleLength(`${hook} | ${site}`, site);
    }
  }

  return ensureSeoTitleLength(`Doğal Ürünler ve Online Alışveriş | ${site}`, site);
}

export function buildSitePageSeoDescription(input: {
  pageTitle: string;
  siteName: string;
  hint?: string;
  fallback?: string;
  kind?: string;
}): string {
  const hint = input.hint?.trim() || input.fallback?.trim();
  const page = input.pageTitle.trim();
  const site = input.siteName.trim();

  const kindPhrase: Record<string, string> = {
    collections: `Tüm ürün koleksiyonlarını keşfedin.`,
    collection: `Bu koleksiyondaki ürünleri inceleyin.`,
    category: `Kategori ürünlerini filtreleyerek bulun.`,
    cms: `Sayfa içeriği ve mağaza politikaları hakkında bilgi alın.`,
    "blog-list": `Blog yazıları, ipuçları ve güncel haberler.`,
    "blog-post": `Blog yazısını okuyun.`,
  };

  const parts = [
    hint && hint.length >= 40 ? hint : null,
    kindPhrase[input.kind ?? ""] ?? null,
    `${page} — ${site} resmi mağazasında güvenli alışveriş, hızlı kargo ve kolay iade.`,
  ].filter(Boolean);

  return ensureSeoDescriptionLength(parts.join(" "));
}

export function buildImageAltText(pageTitle: string, siteName: string): string {
  return truncateSeoText(`${pageTitle.trim()} — ${siteName.trim()}`, 125).replace(/…$/, "");
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
