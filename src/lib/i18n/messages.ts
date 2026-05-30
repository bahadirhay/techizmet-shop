import type { ShopLocale } from "@/lib/i18n/locale";

export type StoreMessages = {
  nav: {
    home: string;
    bestSellers: string;
    collections: string;
    about: string;
    contact: string;
    trackOrder: string;
    account: string;
    cart: string;
    search: string;
  };
  footer: {
    quickLinks: string;
    legal: string;
    tagline: string;
    home: string;
    collections: string;
    about: string;
    contact: string;
    faq: string;
    privacy: string;
    distanceSales: string;
  };
  blocks: {
    explore: string;
    continue: string;
    detail: string;
    products: string;
    subscribe: string;
    emailPlaceholder: string;
  };
  locale: {
    label: string;
    tr: string;
    en: string;
  };
};

const TR: StoreMessages = {
  nav: {
    home: "Ana Sayfa",
    bestSellers: "Çok Satanlar",
    collections: "Koleksiyonlar",
    about: "Hakkımızda",
    contact: "İletişim",
    trackOrder: "Sipariş takip",
    account: "Hesabım",
    cart: "Sepet",
    search: "Ara",
  },
  footer: {
    quickLinks: "Hızlı linkler",
    legal: "Yasal",
    tagline: "Techizmet Shop — Techizmet Shop referans teması",
    home: "Ana sayfa",
    collections: "Koleksiyonlar",
    about: "Hakkımızda",
    contact: "İletişim",
    faq: "SSS",
    privacy: "KVKK",
    distanceSales: "Mesafeli satış",
  },
  blocks: {
    explore: "Keşfet",
    continue: "Devam",
    detail: "Detay",
    products: "ürün",
    subscribe: "Kaydol",
    emailPlaceholder: "E-posta",
  },
  locale: { label: "Dil", tr: "Türkçe", en: "English" },
};

const EN: StoreMessages = {
  nav: {
    home: "Home",
    bestSellers: "Best Sellers",
    collections: "Collections",
    about: "About",
    contact: "Contact",
    trackOrder: "Track order",
    account: "Account",
    cart: "Cart",
    search: "Search",
  },
  footer: {
    quickLinks: "Quick links",
    legal: "Legal",
    tagline: "Techizmet Shop — Techizmet Shop reference theme",
    home: "Home",
    collections: "Collections",
    about: "About",
    contact: "Contact",
    faq: "FAQ",
    privacy: "Privacy",
    distanceSales: "Distance sales",
  },
  blocks: {
    explore: "Explore",
    continue: "Continue",
    detail: "Details",
    products: "products",
    subscribe: "Subscribe",
    emailPlaceholder: "Email",
  },
  locale: { label: "Language", tr: "Türkçe", en: "English" },
};

export function getStoreMessages(locale: ShopLocale): StoreMessages {
  return locale === "en" ? EN : TR;
}
