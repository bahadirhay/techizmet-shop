import type { ShopLocale } from "@/lib/i18n/locale";

/**
 * Kozmetik Shopify şablonundan kalan marka/başlık kalıntıları.
 * Google sitelink'lerde "Our Skincare Picks" / "Glow Begins Here" görünmesin.
 */
export const THEME_COPY_BY_LOCALE: Record<
  ShopLocale,
  ReadonlyArray<readonly [string, string]>
> = {
  tr: [
    ["Our Skincare Picks", "Koleksiyonlarımız"],
    ["Glow Begins Here", "Doğal Ödüller Burada"],
    ["Luxe Skincare", "Doğal Ödüller"],
    ["Image of Luxe Skincare", "Doğal Ödüller Görseli"],
    ["Frequently Asked Questions", "Sıkça Sorulan Sorular"],
    ["Facial Boosters", "Doğal Ödüller"],
    ["Glow Essentials", "Günlük Ödüller"],
    ["Organic Skincare for", "Doğal ödül mamaları —"],
    ["Skincare Collection", "Ödül Maması Koleksiyonu"],
    ["Skincare Essentials Deals", "Ödül Maması Fırsatları"],
  ],
  en: [
    ["Our Skincare Picks", "Our Collections"],
    ["Glow Begins Here", "Natural Treats Begin Here"],
    ["Luxe Skincare", "Natural Treats"],
    ["Image of Luxe Skincare", "Natural Treats image"],
    ["Facial Boosters", "Natural Treats"],
    ["Glow Essentials", "Everyday Treats"],
    ["Organic Skincare for", "Natural dog treats for"],
    ["Skincare Collection", "Treat Collection"],
    ["Skincare Essentials Deals", "Treat Essentials Deals"],
  ],
};

/** Tarama — Google sitelink / meta’da asla görünmemeli */
export const LEGACY_THEME_SCAN_PHRASES: ReadonlyArray<{
  id: string;
  phrase: string;
  severity: "fail" | "warn";
  hint: string;
}> = [
  {
    id: "theking-noor",
    phrase: "theking-noor",
    severity: "fail",
    hint: "Eski Shopify demo mağaza adı",
  },
  {
    id: "skincare-picks",
    phrase: "Our Skincare Picks",
    severity: "fail",
    hint: "Koleksiyon sayfası şablon başlığı",
  },
  {
    id: "glow-begins",
    phrase: "Glow Begins Here",
    severity: "fail",
    hint: "Hakkımızda / banner şablon başlığı",
  },
  {
    id: "luxe-skincare",
    phrase: "Luxe Skincare",
    severity: "fail",
    hint: "Kozmetik koleksiyon adı",
  },
  {
    id: "facial-boosters",
    phrase: "Facial Boosters",
    severity: "warn",
    hint: "Kozmetik koleksiyon adı",
  },
  {
    id: "glow-essentials",
    phrase: "Glow Essentials",
    severity: "warn",
    hint: "Kozmetik koleksiyon adı",
  },
  {
    id: "organic-skincare",
    phrase: "Organic Skincare",
    severity: "warn",
    hint: "Kozmetik şablon metni",
  },
  {
    id: "skincare-collection",
    phrase: "Skincare Collection",
    severity: "warn",
    hint: "Kozmetik şablon metni",
  },
  {
    id: "healthy-looking-skin",
    phrase: "healthy-looking skin",
    severity: "warn",
    hint: "Kozmetik meta açıklama kalıntısı",
  },
  {
    id: "smudge-proof-mascara",
    phrase: "smudge-proof mascara",
    severity: "fail",
    hint: "Demo ürün şablonu",
  },
];

export function applyLegacyThemeCopyToText(
  text: string,
  locale: ShopLocale,
  siteName: string,
): string {
  let out = text;
  const brand = siteName.trim() || "Anatolian Paw";
  if (out.toLowerCase().includes("theking-noor")) {
    out = out.replace(/theking-noor/gi, brand);
  }
  for (const [from, to] of THEME_COPY_BY_LOCALE[locale] ?? THEME_COPY_BY_LOCALE.tr) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

export function sanitizeLegacyThemeCopy(html: string, locale: ShopLocale, siteName: string): string {
  return applyLegacyThemeCopyToText(html, locale, siteName);
}

export type LegacyThemeHit = {
  phraseId: string;
  phrase: string;
  severity: "fail" | "warn";
  hint: string;
};

export function findLegacyThemeHits(text: string): LegacyThemeHit[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const hits: LegacyThemeHit[] = [];
  for (const row of LEGACY_THEME_SCAN_PHRASES) {
    if (lower.includes(row.phrase.toLowerCase())) {
      hits.push({
        phraseId: row.id,
        phrase: row.phrase,
        severity: row.severity,
        hint: row.hint,
      });
    }
  }
  return hits;
}
