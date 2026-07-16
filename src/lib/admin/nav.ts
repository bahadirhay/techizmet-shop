/** Admin sidebar — ShopPHP tarzı gruplu menü */

import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";
import { VITRIN_PAGES } from "@/lib/mirror-vitrin-pages";

export type NavBadgeKey =
  | "ordersPending"
  | "ordersPreparing"
  | "ordersShipped"
  | "ordersRefund"
  | "ordersInvoicePending";

export type AdminNavLink = {
  href: string;
  label: string;
  /** Boş = herkese (giriş yapmış) */
  perm: string | null;
  badgeKey?: NavBadgeKey;
  /** Yakında — gri rozet */
  soon?: boolean;
  /** Alt menü (ör. Sayfalar → Yeni sayfa) */
  children?: AdminNavLink[];
};

/** SEO alt sayfaları — breadcrumb ve menü */
export const ADMIN_SEO_HUB = "/admin/settings/seo-dashboard";

export const ADMIN_SEO_BREADCRUMB = { label: "SEO", href: ADMIN_SEO_HUB } as const;

export const ADMIN_SEO_NAV_ITEMS: AdminNavLink[] = [
  { href: "/admin/settings/seo-dashboard", label: "Komuta Merkezi", perm: "site.settings" },
  { href: "/admin/settings/performance", label: "Site Performansı", perm: "site.settings" },
  { href: "/admin/settings/search-intent", label: "Hedef Aramalar", perm: "site.settings" },
  { href: "/admin/settings/seo", label: "Logo, Favicon & Meta", perm: "site.settings" },
  { href: "/admin/settings/distribution", label: "İndeksleme & GEO", perm: "site.settings" },
  { href: "/admin/settings/bing-webmaster", label: "Bing Webmaster", perm: "site.settings" },
  { href: "/admin/settings/google-merchant", label: "Google Merchant", perm: "site.settings" },
  { href: "/admin/settings/seo-ai", label: "SEO AI", perm: "site.settings" },
];

export type AdminNavGroup = {
  id: string;
  label: string;
  perm: string | null;
  /** true ise menü kapalı başlar (yalnızca aktif rota açılır) */
  collapsedByDefault?: boolean;
  items: AdminNavLink[];
};

export const MARKETPLACE_NAV_ITEMS: AdminNavLink[] = [
  { href: "/admin/integrations", label: "Tüm Platformlar", perm: "store.integrations" },
  { href: "/admin/integrations/insights", label: "Performans & AI Öneriler", perm: "store.integrations" },
  ...MARKETPLACE_PLATFORMS.map((p) => ({
    href: `/admin/integrations?platform=${p.id}`,
    label: p.label,
    perm: "store.integrations" as const,
  })),
];

const VITRIN_PAGE_NAV_CHILDREN: AdminNavLink[] = [
  ...VITRIN_PAGES.map((p) => ({
    href: p.adminPath,
    label: p.label,
    perm: "content.pages" as const,
  })),
  {
    href: "/admin/integrations#mesafeli-satis-legal",
    label: "Mesafeli Satış",
    perm: "content.pages" as const,
  },
];

/**
 * ShopPHP benzeri admin menü — sıra ve etiketler işletme paneline göre.
 * Yetki: store.* / content.* / site.* / users.manage
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Genel",
    perm: "store.dashboard",
    items: [
      { href: "/admin/dashboard", label: "Özet Panel", perm: "store.dashboard" },
      {
        href: "/admin/orders?status=pending",
        label: "Canlı Siparişler",
        perm: "store.orders",
        badgeKey: "ordersPending",
      },
    ],
  },
  {
    id: "reports",
    label: "Raporlar",
    perm: "store.dashboard",
    items: [
      { href: "/admin/analytics", label: "Ziyaretçi & Sepet Terki", perm: "store.dashboard" },
      { href: "/admin/abandoned-carts", label: "Terk edilen sepetler", perm: "store.dashboard" },
      { href: "/admin/analytics/visitors", label: "Ziyaretçi listesi", perm: "store.dashboard" },
      { href: "/admin/reports", label: "Raporlar & Analitik", perm: "store.dashboard" },
    ],
  },
  {
    id: "products",
    label: "Ürün & Katalog",
    perm: "store.products",
    items: [
      { href: "/admin/products", label: "Ürün Yönetimi", perm: "store.products" },
      { href: "/admin/products/pricing", label: "Toplu Fiyat", perm: "store.products" },
      { href: "/admin/products/new", label: "Yeni Ürün", perm: "store.products" },
      { href: "/admin/bundles/new", label: "Yeni Paket", perm: "store.products" },
      { href: "/admin/categories", label: "Kategoriler", perm: "store.products" },
      { href: "/admin/brands", label: "Markalar", perm: "store.products" },
      { href: "/admin/collections", label: "Koleksiyonlar", perm: "store.collections" },
      { href: "/admin/reviews", label: "Ürün Yorumları", perm: "store.products" },
    ],
  },
  {
    id: "orders",
    label: "Siparişler",
    perm: "store.orders",
    items: [
      { href: "/admin/orders", label: "Tüm Siparişler", perm: "store.orders" },
      {
        href: "/admin/orders?status=pending",
        label: "Onay Bekleyen",
        perm: "store.orders",
        badgeKey: "ordersPending",
      },
      {
        href: "/admin/orders?status=preparing",
        label: "Hazırlanan",
        perm: "store.orders",
        badgeKey: "ordersPreparing",
      },
      {
        href: "/admin/orders?status=shipped",
        label: "Kargoda",
        perm: "store.orders",
        badgeKey: "ordersShipped",
      },
      {
        href: "/admin/orders?status=delivered",
        label: "Tamamlanan",
        perm: "store.orders",
      },
      {
        href: "/admin/orders?invoice=pending",
        label: "Fatura Bekleyen",
        perm: "store.orders",
        badgeKey: "ordersInvoicePending",
      },
      {
        href: "/admin/orders?status=refund_requested",
        label: "İade / İptal",
        perm: "store.orders",
        badgeKey: "ordersRefund",
      },
      { href: "/admin/orders/labels", label: "Kargo Etiketi Yazdır", perm: "store.orders" },
    ],
  },
  {
    id: "finance",
    label: "Ön Muhasebe",
    perm: "store.finance",
    items: [
      { href: "/admin/finance", label: "Özet Panel", perm: "store.finance" },
      { href: "/admin/finance/cari", label: "Cari & Alacak/Borç", perm: "store.finance" },
      { href: "/admin/finance/invoices", label: "Faturalar & Onay", perm: "store.finance" },
      { href: "/admin/finance/master-data", label: "Karşı Taraf & Hesaplar", perm: "store.finance" },
      { href: "/admin/finance/transactions", label: "Hareketler", perm: "store.finance" },
      { href: "/admin/finance/transactions/new", label: "Yeni Hareket", perm: "store.finance" },
      { href: "/admin/finance/reconciliation", label: "Pazaryeri Mutabakatı", perm: "store.finance" },
      { href: "/admin/finance/payouts", label: "Hakediş Mutabakatı", perm: "store.finance" },
      { href: "/admin/finance/profitability", label: "Kârlılık Raporu", perm: "store.finance" },
      { href: "/admin/finance/beyanname", label: "Beyanname & Vergi", perm: "store.finance" },
      { href: "/admin/finance/faturalar", label: "Fatura & KDV Takibi", perm: "store.finance" },
      { href: "/admin/finance/fatura-kes", label: "Fatura Kes (e-Arşiv)", perm: "store.finance" },
      { href: "/admin/finance/invoice-lines", label: "Fatura Kalemleri", perm: "store.finance" },
      { href: "/admin/stock", label: "Stok Raporu", perm: "store.finance" },
      { href: "/admin/stock/items", label: "Stok Kartları", perm: "store.finance" },
      { href: "/admin/stock/packaging", label: "Paketleme", perm: "store.finance" },
    ],
  },
  {
    id: "customers",
    label: "Müşteriler & Üyeler",
    perm: "store.customers",
    items: [
      { href: "/admin/customers", label: "Müşteri & Üye Listesi", perm: "store.customers" },
      { href: "/admin/customers?segment=members", label: "Üye Listesi", perm: "store.customers" },
      { href: "/admin/customer-groups", label: "Üye Grupları & İndirim", perm: "store.customers" },
    ],
  },
  {
    id: "marketing",
    label: "Pazarlama",
    perm: "store.campaigns",
    items: [
      { href: "/admin/campaigns", label: "Kupon & Kampanyalar", perm: "store.campaigns" },
      { href: "/admin/campaigns/new", label: "Yeni Kampanya", perm: "store.campaigns" },
      { href: "/admin/marketing/social", label: "Sosyal içerik stüdyosu", perm: "store.campaigns" },
      { href: "/admin/integrations/social", label: "Sosyal yayın API", perm: "store.integrations" },
      { href: "/admin/street-food-fund", label: "Sokak Dostları Mama Fonu", perm: null },
    ],
  },
  {
    id: "shipping",
    label: "Kargo & Lojistik",
    perm: "store.shipping",
    items: [
      { href: "/admin/shipping", label: "Kargo Firmaları", perm: "store.shipping" },
      { href: "/admin/integrations/shipping", label: "Geliver Entegrasyonu", perm: "store.integrations" },
      { href: "/admin/shipping/new", label: "Yeni Kargo Firması", perm: "store.shipping" },
      { href: "/admin/orders/labels", label: "Kargo Etiketi Yazdır", perm: "store.orders" },
    ],
  },
  {
    id: "marketplace",
    label: "Pazaryeri",
    perm: "store.integrations",
    items: MARKETPLACE_NAV_ITEMS,
  },
  {
    id: "payments",
    label: "Ödeme",
    perm: "store.integrations",
    collapsedByDefault: true,
    items: [
      { href: "/admin/integrations/payments#paytr", label: "PayTR", perm: "store.integrations" },
      { href: "/admin/integrations/payments#iyzico", label: "iyzico", perm: "store.integrations" },
      {
        href: "/admin/integrations/payments#havale",
        label: "Havale & Kapıda Ödeme",
        perm: "store.integrations",
      },
      { href: "/admin/settings/efatura", label: "GİB e-Arşiv Fatura", perm: "store.integrations" },
    ],
  },
  {
    id: "notifications",
    label: "Bildirimler",
    perm: "store.integrations",
    collapsedByDefault: true,
    items: [
      {
        href: "/admin/settings/notifications",
        label: "E-posta, SMS & Telegram",
        perm: "store.integrations",
      },
      { href: "/admin/whatsapp", label: "WhatsApp", perm: "store.integrations" },
      { href: "/admin/instagram", label: "Instagram vitrin", perm: "store.integrations" },
      { href: "/admin/integrations/social", label: "Sosyal yayın API", perm: "store.integrations" },
      { href: "/admin/integrations/emails", label: "E-posta Şablonları", perm: "store.integrations" },
    ],
  },
  {
    id: "pages",
    label: "Sayfalar",
    perm: null,
    items: [
      {
        href: "/admin/pages",
        label: "Vitrin Sayfaları",
        perm: "content.pages",
        children: VITRIN_PAGE_NAV_CHILDREN,
      },
      {
        href: "/admin/settings/product-explore",
        label: "Ürün Sayfası Altı",
        perm: "content.pages",
      },
      {
        href: "/admin/blog",
        label: "Blog Yazıları",
        perm: "content.pages",
        children: [
          { href: "/admin/blog/new", label: "Yeni Yazı", perm: "content.pages" },
          { href: "/admin/blog/automation", label: "Otomasyon", perm: "content.pages" },
        ],
      },
      {
        href: "/admin/pages",
        label: "Diğer Sayfalar",
        perm: "content.pages",
        children: [{ href: "/admin/pages/new", label: "Yeni Sayfa", perm: "content.pages" }],
      },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    perm: "site.settings",
    items: ADMIN_SEO_NAV_ITEMS,
  },
  {
    id: "settings",
    label: "Ayarlar & Sistem",
    perm: null,
    collapsedByDefault: true,
    items: [
      { href: "/admin/settings/users", label: "Personel & Panel Yetkileri", perm: "users.manage" },
      { href: "/admin/settings/store", label: "Mağaza Ayarları", perm: "site.settings" },
      { href: "/admin/settings/security", label: "Güvenlik & Şifre", perm: null },
      { href: "/admin/settings/menu", label: "Menü & Kategoriler", perm: "site.theme" },
      { href: "/admin/settings/navigation", label: "Footer & Çerez", perm: "site.theme" },
      { href: "/admin/settings/appearance", label: "Renkler & Görünüm", perm: "site.theme" },
      { href: "/admin/settings/image-guide", label: "Görsel Boyutları", perm: null },
      { href: "/admin/settings/cookie-consents", label: "Çerez Onay Kayıtları", perm: "site.settings" },
      { href: "/admin/theme", label: "Tema & Vitrin Modu", perm: "site.theme" },
    ],
  },
];

function filterNavItems(items: AdminNavLink[], hasPerm: (key: string) => boolean): AdminNavLink[] {
  return items
    .map((item) => {
      const children = item.children?.filter((c) => !c.perm || hasPerm(c.perm));
      return children?.length ? { ...item, children } : { ...item, children: undefined };
    })
    .filter((item) => {
      if (item.children?.length) return !item.perm || hasPerm(item.perm);
      return !item.perm || hasPerm(item.perm);
    });
}

export function filterNavGroups(
  groups: AdminNavGroup[],
  hasPerm: (key: string) => boolean,
): AdminNavGroup[] {
  return groups
    .map((g) => ({
      ...g,
      items: filterNavItems(g.items, hasPerm),
    }))
    .filter((g) => g.items.length > 0);
}

/** Link veya alt menülerinden biri aktif mi */
export function isNavItemActive(
  pathname: string,
  search: URLSearchParams,
  item: AdminNavLink,
  isLinkActive: (pathname: string, search: URLSearchParams, href: string) => boolean,
): boolean {
  if (isLinkActive(pathname, search, item.href)) return true;
  return item.children?.some((c) => isLinkActive(pathname, search, c.href)) ?? false;
}

export const ADMIN_PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Özet Panel",
  "/admin/analytics": "Ziyaretçi & Sepet Terki",
  "/admin/abandoned-carts": "Terk edilen sepetler",
  "/admin/analytics/visitors": "Ziyaretçiler",
  "/admin/reports": "Raporlar & Analitik",
  "/admin/settings/notifications": "Bildirim Ayarları",
  "/admin/whatsapp": "WhatsApp",
  "/admin/instagram": "Instagram vitrin",
  "/admin/settings/efatura": "GİB e-Arşiv Fatura",
  "/admin/settings/seo-ai": "SEO AI Ayarları",
  "/admin/settings/distribution": "İndeksleme & GEO",
  "/admin/settings/image-guide": "Görsel Boyutları",
  "/admin/products": "Ürün Yönetimi",
  "/admin/settings/product-explore": "Ürün Sayfası Altı",
  "/admin/products/pricing": "Toplu Fiyat",
  "/admin/products/new": "Yeni Ürün",
  "/admin/bundles/new": "Yeni Paket",
  "/admin/categories": "Kategoriler",
  "/admin/categories/new": "Yeni Kategori",
  "/admin/brands": "Markalar",
  "/admin/brands/new": "Yeni Marka",
  "/admin/collections": "Koleksiyonlar",
  "/admin/collections/new": "Yeni Koleksiyon",
  "/admin/reviews": "Ürün Yorumları",
  "/admin/orders": "Siparişler",
  "/admin/campaigns": "Kampanyalar",
  "/admin/marketing/social": "Sosyal içerik stüdyosu",
  "/admin/integrations/insights": "Performans & AI Öneriler",
  "/admin/street-food-fund": "Sokak Dostları Mama Fonu",
  "/admin/campaigns/new": "Yeni Kampanya",
  "/admin/home": "Ana Sayfa",
  "/admin/pages": "Sayfalar",
  "/admin/pages/new": "Yeni Sayfa",
  "/admin/customers": "Müşteriler & Üyeler",
  "/admin/customers/new": "Müşteri & Üye Ekle",
  "/admin/customer-groups": "Üye Grupları",
  "/admin/customer-groups/new": "Yeni Üye Grubu",
  "/admin/shipping": "Kargo & Lojistik",
  "/admin/shipping/new": "Yeni Kargo Firması",
  "/admin/integrations": "Pazaryeri",
  "/admin/integrations/payments": "Ödeme Ayarları",
  "/admin/integrations/shipping": "Geliver Kargo",
  "/admin/integrations/social": "Sosyal yayın API",
  "/admin/theme": "Tema & Vitrin",
  "/admin/settings/users": "Personel & Panel Yetkileri",
  "/admin/settings/store": "Mağaza Ayarları",
  "/admin/settings/security": "Güvenlik & Şifre",
  "/admin/settings/seo": "Logo, Favicon & Meta",
  "/admin/settings/seo-dashboard": "SEO Komuta Merkezi",
  "/admin/settings/performance": "Site Performansı",
  "/admin/settings/search-intent": "Hedef Aramalar",
  "/admin/settings/bing-webmaster": "Bing Webmaster",
  "/admin/settings/google-merchant": "Google Merchant Center",
  "/admin/settings/menu": "Menü & Kategoriler",
  "/admin/settings/navigation": "Footer & Çerez",
  "/admin/settings/appearance": "Renkler & Görünüm",
  "/admin/settings/cookie-consents": "Çerez Onay Kayıtları",
  "/admin/finance": "Ön Muhasebe",
  "/admin/finance/cari": "Cari & Alacak/Borç",
  "/admin/finance/transactions": "Finans Hareketleri",
  "/admin/finance/invoices": "Faturalar & Onay",
  "/admin/finance/master-data": "Muhasebe Tanımları",
  "/admin/finance/transactions/new": "Yeni Finans Hareketi",
  "/admin/finance/reconciliation": "Pazaryeri Mutabakatı",
  "/admin/finance/payouts": "Hakediş Mutabakatı",
  "/admin/finance/profitability": "Kârlılık Raporu",
  "/admin/finance/beyanname": "Beyanname & Vergi",
  "/admin/finance/faturalar": "Fatura & KDV Takibi",
  "/admin/finance/fatura-kes": "Fatura Kes (e-Arşiv)",
  "/admin/finance/invoice-lines": "Fatura Kalemleri",
  "/admin/stock": "Stok Raporu",
  "/admin/stock/items": "Stok Kartları",
  "/admin/stock/packaging": "Paketleme",
};
