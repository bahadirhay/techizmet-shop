import type { ShopLocale } from "@/lib/i18n/locale";

/**
 * Kozmetik Shopify şablonundan kalan marka/başlık kalıntıları.
 * Google sitelink'lerde "Our Skincare Picks" / "Glow Begins Here" görünmesin.
 */
const THEME_COPY_BY_LOCALE: Record<ShopLocale, ReadonlyArray<readonly [string, string]>> = {
  tr: [
    ["Our Skincare Picks", "Koleksiyonlarımız"],
    ["Glow Begins Here", "Doğal Ödüller Burada"],
    ["Luxe Skincare", "Doğal Ödüller"],
    ["Image of Luxe Skincare", "Doğal Ödüller Görseli"],
    ["Frequently Asked Questions", "Sıkça Sorulan Sorular"],
  ],
  en: [
    ["Our Skincare Picks", "Our Collections"],
    ["Glow Begins Here", "Natural Treats Begin Here"],
    ["Luxe Skincare", "Natural Treats"],
    ["Image of Luxe Skincare", "Natural Treats image"],
  ],
};

export function sanitizeLegacyThemeCopy(html: string, locale: ShopLocale, siteName: string): string {
  let out = html;
  const brand = siteName.trim() || "Anatolian Paw";
  if (out.includes("theking-noor")) {
    out = out.split("theking-noor").join(brand);
  }
  for (const [from, to] of THEME_COPY_BY_LOCALE[locale] ?? THEME_COPY_BY_LOCALE.tr) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}
