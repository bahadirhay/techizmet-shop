/** Admin sidebar — ShopPHP tarzı gruplu menü */

import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";
import { VITRIN_PAGES } from "@/lib/mirror-vitrin-pages";

export type NavBadgeKey =
  | "ordersPending"
  | "ordersPreparing"
  | "ordersShipped"
  | "ordersRefund";

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

export type AdminNavGroup = {
  id: string;
  label: string;
  perm: string | null;
  /** true ise menü kapalı başlar (yalnızca aktif rota açılır) */
  collapsedByDefault?: boolean;
  items: AdminNavLink[];
};

export const MARKETPLACE_NAV_ITEMS: AdminNavLink[] = [
  { href: "/admin/integrations", label: "Tüm platformlar", perm: "store.integrations" },
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
    href: "/admin/pages/edit/mesafeli-satis",
    label: "Mesafeli satış",
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
      { href: "/admin/dashboard", label: "Özet panel", perm: "store.dashboard" },
      { href: "/admin/reports", label: "Raporlar & analitik", perm: "store.dashboard" },
      {
        href: "/admin/orders?status=pending",
        label: "Canlı siparişler",
        perm: "store.orders",
        badgeKey: "ordersPending",
      },
    ],
  },
  {
    id: "products",
    label: "Ürün & Katalog",
    perm: "store.products",
    items: [
      { href: "/admin/products", label: "Ürün yönetimi", perm: "store.products" },
      { href: "/admin/products/pricing", label: "Toplu fiyat", perm: "store.products" },
      { href: "/admin/products/new", label: "Yeni ürün", perm: "store.products" },
      { href: "/admin/categories", label: "Kategoriler", perm: "store.products" },
      { href: "/admin/brands", label: "Markalar", perm: "store.products" },
      { href: "/admin/collections", label: "Koleksiyonlar", perm: "store.collections" },
    ],
  },
  {
    id: "orders",
    label: "Siparişler",
    perm: "store.orders",
    items: [
      { href: "/admin/orders", label: "Tüm siparişler", perm: "store.orders" },
      {
        href: "/admin/orders?status=pending",
        label: "Onay bekleyen",
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
        href: "/admin/orders?status=refund_requested",
        label: "İade / iptal",
        perm: "store.orders",
        badgeKey: "ordersRefund",
      },
      { href: "/admin/orders/labels", label: "Kargo etiketi bas", perm: "store.orders" },
    ],
  },
  {
    id: "finance",
    label: "Ön Muhasebe",
    perm: "store.finance",
    items: [
      { href: "/admin/finance", label: "Özet panel", perm: "store.finance" },
      { href: "/admin/finance/transactions", label: "Hareketler", perm: "store.finance" },
      { href: "/admin/finance/transactions/new", label: "Yeni hareket", perm: "store.finance" },
      { href: "/admin/finance/reconciliation", label: "Pazaryeri mutabakat", perm: "store.finance" },
      { href: "/admin/finance/payouts", label: "Hakediş mutabakat", perm: "store.finance" },
      { href: "/admin/finance/profitability", label: "Kârlılık raporu", perm: "store.finance" },
    ],
  },
  {
    id: "customers",
    label: "Müşteriler & Üyeler",
    perm: "store.customers",
    items: [
      { href: "/admin/customers", label: "Müşteri / üye listesi", perm: "store.customers" },
      { href: "/admin/customers?segment=members", label: "Üye listesi", perm: "store.customers" },
      { href: "/admin/customer-groups", label: "Üye grupları & indirim", perm: "store.customers" },
    ],
  },
  {
    id: "marketing",
    label: "Kampanyalar",
    perm: "store.campaigns",
    items: [
      { href: "/admin/campaigns", label: "Kupon & kampanyalar", perm: "store.campaigns" },
      { href: "/admin/campaigns/new", label: "Yeni kampanya", perm: "store.campaigns" },
    ],
  },
  {
    id: "shipping",
    label: "Kargo & Lojistik",
    perm: "store.shipping",
    items: [
      { href: "/admin/shipping", label: "Kargo firmaları", perm: "store.shipping" },
      { href: "/admin/shipping/new", label: "Yeni kargo firması", perm: "store.shipping" },
      { href: "/admin/orders/labels", label: "Kargo etiketi bas", perm: "store.orders" },
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
        label: "Havale & kapıda ödeme",
        perm: "store.integrations",
      },
      { href: "/admin/settings/efatura", label: "GİB e-Fatura", perm: "store.integrations" },
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
      { href: "/admin/integrations/emails", label: "E-posta şablonları", perm: "store.integrations" },
    ],
  },
  {
    id: "pages",
    label: "Sayfalar",
    perm: null,
    items: [
      {
        href: "/admin/pages",
        label: "Vitrin sayfaları",
        perm: "content.pages",
        children: VITRIN_PAGE_NAV_CHILDREN,
      },
      {
        href: "/admin/settings/product-explore",
        label: "Ürün sayfası altı",
        perm: "content.pages",
      },
      {
        href: "/admin/blog",
        label: "Blog yazıları",
        perm: "content.pages",
        children: [{ href: "/admin/blog/new", label: "Yeni yazı", perm: "content.pages" }],
      },
      {
        href: "/admin/pages",
        label: "Diğer sayfalar",
        perm: "content.pages",
        children: [{ href: "/admin/pages/new", label: "Yeni sayfa", perm: "content.pages" }],
      },
    ],
  },
  {
    id: "settings",
    label: "Ayarlar & Sistem",
    perm: null,
    collapsedByDefault: true,
    items: [
      { href: "/admin/settings/users", label: "Personel & panel yetkileri", perm: "users.manage" },
      { href: "/admin/settings/store", label: "Mağaza ayarları", perm: "site.settings" },
      { href: "/admin/settings/security", label: "Güvenlik & şifre", perm: null },
      { href: "/admin/settings/menu", label: "Menü & kategoriler", perm: "site.theme" },
      { href: "/admin/settings/navigation", label: "Footer & çerez", perm: "site.theme" },
      { href: "/admin/settings/seo", label: "Logo, favicon & SEO", perm: "site.settings" },
      { href: "/admin/settings/seo-ai", label: "SEO AI (Gemini/Claude)", perm: "site.settings" },
      { href: "/admin/settings/image-guide", label: "Görsel boyutları", perm: null },
      { href: "/admin/settings/cookie-consents", label: "Çerez onay logları", perm: "site.settings" },
      { href: "/admin/theme", label: "Tema & vitrin modu", perm: "site.theme" },
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
  "/admin/dashboard": "Özet panel",
  "/admin/reports": "Raporlar",
  "/admin/settings/notifications": "Bildirim ayarları",
  "/admin/settings/efatura": "GİB e-Fatura",
  "/admin/settings/seo-ai": "SEO AI ayarları",
  "/admin/settings/image-guide": "Görsel boyutları",
  "/admin/products": "Ürün yönetimi",
  "/admin/settings/product-explore": "Ürün sayfası altı",
  "/admin/products/pricing": "Toplu fiyat",
  "/admin/products/new": "Yeni ürün",
  "/admin/categories": "Kategoriler",
  "/admin/categories/new": "Yeni kategori",
  "/admin/brands": "Markalar",
  "/admin/brands/new": "Yeni marka",
  "/admin/collections": "Koleksiyonlar",
  "/admin/collections/new": "Yeni koleksiyon",
  "/admin/orders": "Siparişler",
  "/admin/campaigns": "Kampanyalar",
  "/admin/campaigns/new": "Yeni kampanya",
  "/admin/home": "Ana Sayfa",
  "/admin/pages": "Sayfalar",
  "/admin/pages/new": "Yeni sayfa",
  "/admin/customers": "Müşteriler & üyeler",
  "/admin/customer-groups": "Üye grupları",
  "/admin/customer-groups/new": "Yeni üye grubu",
  "/admin/shipping": "Kargo",
  "/admin/shipping/new": "Yeni kargo firması",
  "/admin/integrations": "Pazaryeri",
  "/admin/integrations/payments": "Ödeme ayarları",
  "/admin/integrations/emails": "E-posta şablonları",
  "/admin/theme": "Tema & vitrin",
  "/admin/settings/users": "Panel kullanıcıları",
  "/admin/settings/store": "Mağaza ayarları",
  "/admin/settings/security": "Güvenlik & şifre",
  "/admin/settings/seo": "Logo, favicon & SEO",
  "/admin/settings/menu": "Menü & kategoriler",
  "/admin/settings/navigation": "Footer & çerez",
  "/admin/settings/cookie-consents": "Çerez onay logları",
  "/admin/finance": "Ön muhasebe",
  "/admin/finance/transactions": "Finans hareketleri",
  "/admin/finance/transactions/new": "Yeni finans hareketi",
  "/admin/finance/reconciliation": "Pazaryeri mutabakat",
  "/admin/finance/payouts": "Hakediş mutabakat",
  "/admin/finance/profitability": "Kârlılık raporu",
};
