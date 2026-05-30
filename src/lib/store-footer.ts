import type { ShopLocale } from "@/lib/i18n/locale";
import type { SiteSettings } from "@/lib/site-settings";

export type FooterLinkItem = {
  id: string;
  href: string;
  labelTr: string;
  labelEn: string;
};

export type FooterMenuColumn = {
  id: string;
  titleTr: string;
  titleEn: string;
  links: FooterLinkItem[];
};

export type StoreFooterConfig = {
  introTr?: string;
  introEn?: string;
  taglineTr?: string;
  taglineEn?: string;
  columns?: FooterMenuColumn[];
};

function link(
  id: string,
  href: string,
  labelTr: string,
  labelEn: string,
): FooterLinkItem {
  return { id, href, labelTr, labelEn };
}

export const DEFAULT_STORE_FOOTER: StoreFooterConfig = {
  introTr:
    "Doğal güzelliğinizi öne çıkarmak yalnızca bir slogan değil — kim olduğunuzu kucaklayan bir felsefedir. Cildinize güven duymanızı teşvik eder.",
  introEn:
    "Enhance Your Natural Beauty is more than just a tagline — it's a philosophy that embraces who you are.",
  taglineTr: "Temiz, cilde sevgi dolu formüller — saf, bitki bazlı içeriklerle doğal ışıltı.",
  taglineEn:
    "A celebration of clean, skin-loving formulas crafted from pure, plant-based ingredients for naturally radiant results.",
  columns: [
    {
      id: "top-selling",
      titleTr: "Çok Satanlar",
      titleEn: "Top Selling",
      links: [
        link("ts1", "/products/anti-cellulite-body-oil", "Anti-Selülit Vücut Yağı", "Anti-Cellulite Body Oil"),
        link("ts2", "/products/berry-tint-lip-balm", "Berry Dudak Balmı", "Berry Tint Lip Balm"),
        link("ts3", "/products/daily-use-face-moisturizer", "Yüz Nemlendirici", "Face Moisturizer"),
        link("ts4", "/products/ultra-fine-hydration-mist", "Ultra İnce Mist", "Ultra-Fine Mist"),
        link("ts5", "/products/dewmist-hydrating-makeup-fixer", "Makyaj Sabitleyici", "Makeup Fixer"),
      ],
    },
    {
      id: "quick-links",
      titleTr: "Hızlı Linkler",
      titleEn: "Quick Links",
      links: [
        link("ql1", "/", "Ana Sayfa", "Home"),
        link("ql2", "/search.html", "Arama", "Search"),
        link("ql3", "/collections", "Tüm koleksiyonlar", "All collections"),
        link("ql4", "/pages/about", "Hakkımızda", "About"),
        link("ql5", "/blogs/news.html", "Blog", "News"),
      ],
    },
    {
      id: "help",
      titleTr: "Yardım & Destek",
      titleEn: "Help & Support",
      links: [
        link("h1", "/pages/contact", "İletişim", "Contact"),
        link("h2", "/pages/faq", "SSS", "FAQ"),
        link("h3", "/policies/privacy-policy.html", "Gizlilik", "Privacy Policy"),
        link("h4", "/policies/terms-of-service.html", "Kullanım şartları", "Terms of Use"),
        link("h5", "/policies/refund-policy.html", "İade politikası", "Return Policy"),
      ],
    },
  ],
};

export function getStoreFooterConfig(settings: SiteSettings): StoreFooterConfig {
  const raw = settings.theme?.footer;
  if (!raw?.columns?.length) return DEFAULT_STORE_FOOTER;
  return {
    introTr: raw.introTr?.trim() || DEFAULT_STORE_FOOTER.introTr,
    introEn: raw.introEn?.trim() || DEFAULT_STORE_FOOTER.introEn,
    taglineTr: raw.taglineTr?.trim() || DEFAULT_STORE_FOOTER.taglineTr,
    taglineEn: raw.taglineEn?.trim() || DEFAULT_STORE_FOOTER.taglineEn,
    columns: raw.columns
      .filter((c) => c && c.links?.length)
      .map((c) => ({
        id: c.id || `col-${c.titleTr}`,
        titleTr: c.titleTr?.trim() || c.titleEn?.trim() || "Menü",
        titleEn: c.titleEn?.trim() || c.titleTr?.trim() || "Menu",
        links: (c.links ?? [])
          .filter((l) => l?.href?.trim())
          .map((l) => ({
            id: l.id || `lnk-${l.href}`,
            href: l.href.trim(),
            labelTr: l.labelTr?.trim() || l.labelEn?.trim() || "Link",
            labelEn: l.labelEn?.trim() || l.labelTr?.trim() || "Link",
          })),
      }))
      .filter((c) => c.links.length > 0),
  };
}

export function footerLinkLabel(item: FooterLinkItem, locale: ShopLocale): string {
  return locale === "tr" ? item.labelTr : item.labelEn;
}

export function footerColumnTitle(col: FooterMenuColumn, locale: ShopLocale): string {
  return locale === "tr" ? col.titleTr : col.titleEn;
}

export function footerIntroHtml(config: StoreFooterConfig, locale: ShopLocale): string {
  const text = (locale === "tr" ? config.introTr : config.introEn) ?? "";
  return text.replace(/\n/g, "<br />\n");
}

export function footerTaglineHtml(config: StoreFooterConfig, locale: ShopLocale): string {
  return (locale === "tr" ? config.taglineTr : config.taglineEn) ?? "";
}
