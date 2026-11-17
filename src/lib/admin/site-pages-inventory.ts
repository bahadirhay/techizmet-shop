import {
  DEFAULT_SEARCH_INTENTS,
  LANDING_COLLECTION_SLUGS,
} from "@/lib/seo/search-intent";
import { LANDING_CONTENT } from "@/lib/seo/landing-content";
import { THEME_SHELL_COMMERCE_PATHS } from "@/lib/theme-shell-pilot";
import { VITRIN_PAGES } from "@/lib/mirror-vitrin-pages";

export type SitePageInventoryRow = {
  key: string;
  label: string;
  route: string;
  /** Admin düzenleme / yönetim yolu (yoksa yalnızca vitrin) */
  adminHref?: string;
  note?: string;
};

const COMMERCE_LABELS: Record<string, string> = {
  "/box": "Kutu / Bundle",
  "/cart": "Sepet",
  "/checkout": "Ödeme",
  "/checkout/pay": "Kart ile ödeme",
  "/checkout/success": "Sipariş başarılı",
  "/search": "Arama",
  "/account": "Hesabım",
  "/account/login": "Giriş",
  "/account/register": "Kayıt ol",
  "/account/forgot-password": "Şifremi unuttum",
  "/account/favorites": "Favoriler",
  "/orders/track": "Sipariş takip",
};

const UTILITY_PAGES: SitePageInventoryRow[] = [
  {
    key: "unsubscribe",
    label: "E-posta abonelikten çık",
    route: "/unsubscribe",
    note: "Pazarlama e-postası tercihleri",
  },
  {
    key: "bakim",
    label: "Bakım modu",
    route: "/bakim",
    note: "Site kapalıyken gösterilir",
  },
  {
    key: "account-reset-password",
    label: "Şifre sıfırla",
    route: "/account/reset-password",
    note: "E-posta bağlantısı ile açılır",
  },
];

function landingLabel(slug: string): string {
  const intent = DEFAULT_SEARCH_INTENTS.find((i) => i.collectionSlug === slug);
  if (intent?.h1?.trim()) return intent.h1.trim();
  if (intent?.title?.trim()) return intent.title.split("|")[0]!.trim();
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Vitrin listesinde zaten olan rotalar (çift göstermemek için). */
export function vitrinRouteSet(): Set<string> {
  return new Set(VITRIN_PAGES.map((p) => p.route));
}

/** SEO landing koleksiyon sayfaları (`/collections/{slug}`). */
export function inventorySeoLandingPages(): SitePageInventoryRow[] {
  const slugs = [
    ...new Set([...LANDING_COLLECTION_SLUGS, ...Object.keys(LANDING_CONTENT)]),
  ].sort((a, b) => landingLabel(a).localeCompare(landingLabel(b), "tr"));

  return slugs.map((slug) => ({
    key: `landing:${slug}`,
    label: landingLabel(slug),
    route: `/collections/${slug}`,
    adminHref: `/admin/pages/landing/${slug}`,
    note: "SEO landing — hero ve metin düzenlenebilir",
  }));
}

/** Sepet, ödeme, hesap vb. sabit vitrin rotaları. */
export function inventoryCommercePages(): SitePageInventoryRow[] {
  return THEME_SHELL_COMMERCE_PATHS.map((route) => ({
    key: `commerce:${route}`,
    label: COMMERCE_LABELS[route] ?? route,
    route,
    note: "Tema kabuğu — içerik sabit / akış sayfası",
  }));
}

export function inventoryUtilityPages(): SitePageInventoryRow[] {
  return UTILITY_PAGES;
}
