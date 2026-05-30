import type { ShopLocale } from "@/lib/i18n/locale";
import { toBrandedMirrorSrc } from "@/lib/mirror-html-branding";

/** Admin + vitrinde bağlı King Noor sayfaları */
export type VitrinPageKey =
  | "home"
  | "collections"
  | "collections-all"
  | "about"
  | "contact"
  | "faq"
  | "blog-news";

/** Mirror HTML var; CMS blok editörü yerine vitrin editörü kullanılır */
export const MIRROR_CONTENT_PAGE_SLUGS = ["about", "contact", "faq"] as const;

export type VitrinPageDef = {
  key: VitrinPageKey;
  label: string;
  route: string;
  adminPath: string;
  /** Diskteki mirror HTML (sunucu okuma) */
  mirrorFileRel: (locale: ShopLocale) => string;
  /** Vitrin iframe src — markalı API */
  mirrorPath: (locale: ShopLocale) => string;
};

const MIRROR_FILE: Record<VitrinPageKey, { tr: string; en: string }> = {
  home: {
    tr: "theme/king-noor/mirror/index-tr.html",
    en: "theme/king-noor/mirror/index.html",
  },
  collections: {
    tr: "theme/king-noor/mirror/collections/index-tr.html",
    en: "theme/king-noor/mirror/collections/index.html",
  },
  "collections-all": {
    tr: "theme/king-noor/mirror/collections/all-tr.html",
    en: "theme/king-noor/mirror/collections/all.html",
  },
  about: {
    tr: "theme/king-noor/mirror/pages/about-tr.html",
    en: "theme/king-noor/mirror/pages/about.html",
  },
  contact: {
    tr: "theme/king-noor/mirror/pages/contact-tr.html",
    en: "theme/king-noor/mirror/pages/contact.html",
  },
  faq: {
    tr: "theme/king-noor/mirror/pages/faq-tr.html",
    en: "theme/king-noor/mirror/pages/faq.html",
  },
  "blog-news": {
    tr: "theme/king-noor/mirror/blogs/news/index-tr.html",
    en: "theme/king-noor/mirror/blogs/news/index.html",
  },
};

export function vitrinMirrorFileRel(pageKey: VitrinPageKey, locale: ShopLocale): string {
  const f = MIRROR_FILE[pageKey];
  return locale === "tr" ? f.tr : f.en;
}

export const VITRIN_PAGES: VitrinPageDef[] = [
  {
    key: "home",
    label: "Ana Sayfa",
    route: "/",
    adminPath: "/admin/pages/vitrin/home",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("home", locale),
    mirrorPath: (locale) => toBrandedMirrorSrc(vitrinMirrorFileRel("home", locale), "home"),
  },
  {
    key: "collections",
    label: "Koleksiyonlar",
    route: "/collections",
    adminPath: "/admin/pages/vitrin/collections",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("collections", locale),
    mirrorPath: (locale) => toBrandedMirrorSrc(vitrinMirrorFileRel("collections", locale), "collections"),
  },
  {
    key: "collections-all",
    label: "Çok Satanlar",
    route: "/collections/all",
    adminPath: "/admin/pages/vitrin/collections-all",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("collections-all", locale),
    mirrorPath: (locale) => toBrandedMirrorSrc(vitrinMirrorFileRel("collections-all", locale), "collections-all"),
  },
  {
    key: "about",
    label: "Hakkımızda",
    route: "/pages/about",
    adminPath: "/admin/pages/vitrin/about",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("about", locale),
    mirrorPath: (locale) => toBrandedMirrorSrc(vitrinMirrorFileRel("about", locale), "about"),
  },
  {
    key: "contact",
    label: "İletişim",
    route: "/pages/contact",
    adminPath: "/admin/pages/vitrin/contact",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("contact", locale),
    mirrorPath: (locale) => toBrandedMirrorSrc(vitrinMirrorFileRel("contact", locale), "contact"),
  },
  {
    key: "faq",
    label: "SSS / FAQ",
    route: "/pages/faq",
    adminPath: "/admin/pages/vitrin/faq",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("faq", locale),
    mirrorPath: (locale) => toBrandedMirrorSrc(vitrinMirrorFileRel("faq", locale), "faq"),
  },
  {
    key: "blog-news",
    label: "Blog / Haberler",
    route: "/blogs/news",
    adminPath: "/admin/pages/vitrin/blog-news",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("blog-news", locale),
    mirrorPath: (locale) => toBrandedMirrorSrc(vitrinMirrorFileRel("blog-news", locale), "blog-news"),
  },
];

export function getVitrinPage(key: string): VitrinPageDef | undefined {
  return VITRIN_PAGES.find((p) => p.key === key);
}

export function isVitrinPageKey(key: string): key is VitrinPageKey {
  return VITRIN_PAGES.some((p) => p.key === key);
}
