import type { ShopLocale } from "@/lib/i18n/locale";
import { buildMirrorIframeSrc } from "@/lib/mirror-iframe-src";

/** Admin + vitrinde bağlı Techizmet Shop sayfaları */
export type VitrinPageKey =
  | "home"
  | "collections"
  | "collections-all"
  | "about"
  | "contact"
  | "faq"
  | "privacy-policy"
  | "terms-of-service"
  | "refund-policy"
  | "blog-news";

/** Mirror HTML var; CMS blok editörü yerine vitrin editörü kullanılır */
export const MIRROR_CONTENT_PAGE_SLUGS = [
  "about",
  "contact",
  "faq",
  "privacy-policy",
  "terms-of-service",
  "refund-policy",
] as const;

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
    tr: "theme/techizmet-shop/mirror/index-tr.html",
    en: "theme/techizmet-shop/mirror/index.html",
  },
  collections: {
    tr: "theme/techizmet-shop/mirror/collections/index-tr.html",
    en: "theme/techizmet-shop/mirror/collections/index.html",
  },
  "collections-all": {
    tr: "theme/techizmet-shop/mirror/collections/all-tr.html",
    en: "theme/techizmet-shop/mirror/collections/all.html",
  },
  about: {
    tr: "theme/techizmet-shop/mirror/pages/about-tr.html",
    en: "theme/techizmet-shop/mirror/pages/about.html",
  },
  contact: {
    tr: "theme/techizmet-shop/mirror/pages/contact-tr.html",
    en: "theme/techizmet-shop/mirror/pages/contact.html",
  },
  faq: {
    tr: "theme/techizmet-shop/mirror/pages/faq-tr.html",
    en: "theme/techizmet-shop/mirror/pages/faq.html",
  },
  "privacy-policy": {
    tr: "theme/techizmet-shop/mirror/pages/privacy-policy-tr.html",
    en: "theme/techizmet-shop/mirror/pages/privacy-policy.html",
  },
  "terms-of-service": {
    tr: "theme/techizmet-shop/mirror/pages/terms-of-service-tr.html",
    en: "theme/techizmet-shop/mirror/pages/terms-of-service.html",
  },
  "refund-policy": {
    tr: "theme/techizmet-shop/mirror/pages/refund-policy-tr.html",
    en: "theme/techizmet-shop/mirror/pages/refund-policy.html",
  },
  "blog-news": {
    tr: "theme/techizmet-shop/mirror/blogs/news/index-tr.html",
    en: "theme/techizmet-shop/mirror/blogs/news/index.html",
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
    mirrorPath: (locale) => buildMirrorIframeSrc(vitrinMirrorFileRel("home", locale), "home"),
  },
  {
    key: "collections",
    label: "Koleksiyonlar",
    route: "/collections",
    adminPath: "/admin/pages/vitrin/collections",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("collections", locale),
    mirrorPath: (locale) => buildMirrorIframeSrc(vitrinMirrorFileRel("collections", locale), "collections"),
  },
  {
    key: "collections-all",
    label: "Çok Satanlar",
    route: "/collections/all",
    adminPath: "/admin/pages/vitrin/collections-all",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("collections-all", locale),
    mirrorPath: (locale) => buildMirrorIframeSrc(vitrinMirrorFileRel("collections-all", locale), "collections-all"),
  },
  {
    key: "about",
    label: "Hakkımızda",
    route: "/pages/about",
    adminPath: "/admin/pages/vitrin/about",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("about", locale),
    mirrorPath: (locale) => buildMirrorIframeSrc(vitrinMirrorFileRel("about", locale), "about"),
  },
  {
    key: "contact",
    label: "İletişim",
    route: "/pages/contact",
    adminPath: "/admin/pages/vitrin/contact",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("contact", locale),
    mirrorPath: (locale) => buildMirrorIframeSrc(vitrinMirrorFileRel("contact", locale), "contact"),
  },
  {
    key: "faq",
    label: "SSS / FAQ",
    route: "/pages/faq",
    adminPath: "/admin/pages/vitrin/faq",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("faq", locale),
    mirrorPath: (locale) => buildMirrorIframeSrc(vitrinMirrorFileRel("faq", locale), "faq"),
  },
  {
    key: "privacy-policy",
    label: "Gizlilik politikası",
    route: "/pages/privacy-policy",
    adminPath: "/admin/pages/vitrin/privacy-policy",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("privacy-policy", locale),
    mirrorPath: (locale) =>
      buildMirrorIframeSrc(vitrinMirrorFileRel("privacy-policy", locale), "privacy-policy"),
  },
  {
    key: "terms-of-service",
    label: "Hizmet şartları",
    route: "/pages/terms-of-service",
    adminPath: "/admin/pages/vitrin/terms-of-service",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("terms-of-service", locale),
    mirrorPath: (locale) =>
      buildMirrorIframeSrc(vitrinMirrorFileRel("terms-of-service", locale), "terms-of-service"),
  },
  {
    key: "refund-policy",
    label: "İade politikası",
    route: "/pages/refund-policy",
    adminPath: "/admin/pages/vitrin/refund-policy",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("refund-policy", locale),
    mirrorPath: (locale) =>
      buildMirrorIframeSrc(vitrinMirrorFileRel("refund-policy", locale), "refund-policy"),
  },
  {
    key: "blog-news",
    label: "Blog / Haberler",
    route: "/blogs/news",
    adminPath: "/admin/pages/vitrin/blog-news",
    mirrorFileRel: (locale) => vitrinMirrorFileRel("blog-news", locale),
    mirrorPath: (locale) => buildMirrorIframeSrc(vitrinMirrorFileRel("blog-news", locale), "blog-news"),
  },
];

export function getVitrinPage(key: string): VitrinPageDef | undefined {
  return VITRIN_PAGES.find((p) => p.key === key);
}

export function isVitrinPageKey(key: string): key is VitrinPageKey {
  return VITRIN_PAGES.some((p) => p.key === key);
}
