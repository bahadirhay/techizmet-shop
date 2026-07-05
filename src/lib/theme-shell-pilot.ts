import {
  MIRROR_CONTENT_PAGE_SLUGS,
  type VitrinPageKey,
} from "@/lib/mirror-vitrin-pages";

/** Tema kabuğu — mirror iframe yerine React header/footer + vitrin içeriği */
export const THEME_SHELL_PILOT_PAGE_SLUGS = MIRROR_CONTENT_PAGE_SLUGS;

/** @deprecated — use THEME_SHELL_PILOT_PAGE_SLUGS */
export const THEME_SHELL_PILOT_SLUGS = THEME_SHELL_PILOT_PAGE_SLUGS;

export type ThemeShellPilotPageSlug = (typeof THEME_SHELL_PILOT_PAGE_SLUGS)[number];

/** @deprecated — use ThemeShellPilotPageSlug */
export type ThemeShellPilotSlug = ThemeShellPilotPageSlug;

/** @deprecated — tüm koleksiyon slug'ları tema kabuğunda */
export const THEME_SHELL_PILOT_COLLECTION_SLUGS = ["all"] as const;

export type ThemeShellPilotCollectionSlug = (typeof THEME_SHELL_PILOT_COLLECTION_SLUGS)[number];

/** /pages dışındaki vitrin rotaları → mirror pageKey */
export const THEME_SHELL_VITRIN_ROUTES = {
  "/blogs/news": "blog-news",
  "/collections": "collections",
  "/sokak-dostlari": "sokak-dostlari",
} as const satisfies Record<string, VitrinPageKey>;

export type ThemeShellVitrinRoute = keyof typeof THEME_SHELL_VITRIN_ROUTES;

/** Sepet, ödeme, hesap, arama — tema kabuğu (embed yalnızca ?embed=1 ile minimal) */
export const THEME_SHELL_COMMERCE_PATHS = [
  "/cart",
  "/checkout",
  "/checkout/pay",
  "/checkout/success",
  "/search",
  "/account",
  "/account/login",
  "/account/register",
  "/account/forgot-password",
  "/account/favorites",
  "/orders/track",
] as const;

export type ThemeShellCommercePath = (typeof THEME_SHELL_COMMERCE_PATHS)[number];

/** iframe içi — header/footer yok (?embed=1 veya mirror iframe) */
export const THEME_SHELL_MINIMAL_CHROME_PATHS = [
  "/checkout/embed",
  "/orders/track/embed",
] as const;

export function isThemeShellPilotPageSlug(slug: string): slug is ThemeShellPilotPageSlug {
  return (THEME_SHELL_PILOT_PAGE_SLUGS as readonly string[]).includes(slug);
}

/** @deprecated — use isThemeShellPilotPageSlug */
export function isThemeShellPilotSlug(slug: string): slug is ThemeShellPilotSlug {
  return isThemeShellPilotPageSlug(slug);
}

export function isThemeShellPilotCollectionSlug(slug: string): boolean {
  return Boolean(slug?.trim());
}

export function isThemeShellCommercePath(pathname: string): pathname is ThemeShellCommercePath {
  return (THEME_SHELL_COMMERCE_PATHS as readonly string[]).includes(pathname);
}

export function isThemeShellMinimalChromePath(pathname: string): boolean {
  return (THEME_SHELL_MINIMAL_CHROME_PATHS as readonly string[]).includes(pathname);
}

export function themeShellBlogSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/blogs\/news\/([^/]+)$/);
  if (!m?.[1]) return null;
  return m[1].replace(/\.html$/i, "");
}

export function isThemeShellBlogArticlePath(pathname: string): boolean {
  return themeShellBlogSlugFromPath(pathname) !== null;
}

export function isThemeShellEnabledForBlogArticlePath(
  pathname: string,
  query?: ThemeShellPilotQuery,
  pilotLive = process.env.THEME_SHELL_PILOT_LIVE === "1",
): boolean {
  if (!isThemeShellBlogArticlePath(pathname)) return false;
  return themeShellOptIn(query, pilotLive);
}

export function themeShellSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/pages\/([^/]+)$/);
  return m?.[1] ?? null;
}

export function themeShellCollectionSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/collections\/([^/]+)$/);
  return m?.[1] ?? null;
}

export function themeShellProductSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/products\/([^/]+)$/);
  return m?.[1] ?? null;
}

export function themeShellVitrinKeyFromPath(pathname: string): VitrinPageKey | null {
  return THEME_SHELL_VITRIN_ROUTES[pathname as ThemeShellVitrinRoute] ?? null;
}

export function isThemeShellVitrinRoutePath(pathname: string): boolean {
  return themeShellVitrinKeyFromPath(pathname) !== null;
}

export function isThemeShellProductPath(pathname: string): boolean {
  return themeShellProductSlugFromPath(pathname) !== null;
}

export function isThemeShellHomePath(pathname: string): boolean {
  return pathname === "/";
}

export function isThemeShellCollectionPath(pathname: string): boolean {
  return themeShellCollectionSlugFromPath(pathname) !== null;
}

export function isThemeShellPilotPath(pathname: string): boolean {
  if (isThemeShellMinimalChromePath(pathname)) return false;
  if (isThemeShellHomePath(pathname)) return true;
  if (isThemeShellCommercePath(pathname)) return true;
  if (isThemeShellVitrinRoutePath(pathname)) return true;
  const pageSlug = themeShellSlugFromPath(pathname);
  if (pageSlug && isThemeShellPilotPageSlug(pageSlug)) return true;
  if (isThemeShellCollectionPath(pathname)) return true;
  if (isThemeShellProductPath(pathname)) return true;
  if (isThemeShellBlogArticlePath(pathname)) return true;
  return false;
}

export type ThemeShellPilotQuery = {
  themeShell?: string | null;
  mirror?: string | null;
};

function themeShellOptIn(query: ThemeShellPilotQuery | undefined, pilotLive: boolean): boolean {
  if (query?.mirror === "1") return false;
  if (query?.themeShell === "1") return true;
  return pilotLive;
}

export function isThemeShellEnabledForPagesPath(
  pathname: string,
  query?: ThemeShellPilotQuery,
  pilotLive = process.env.THEME_SHELL_PILOT_LIVE === "1",
): boolean {
  if (!themeShellSlugFromPath(pathname)) return false;
  return themeShellOptIn(query, pilotLive);
}

/** ?mirror=1 → iframe; ?themeShell=1 veya THEME_SHELL_PILOT_LIVE=1 → React kabuk */
export function isThemeShellEnabledForSlug(
  slug: string,
  query?: ThemeShellPilotQuery,
  pilotLive = process.env.THEME_SHELL_PILOT_LIVE === "1",
): boolean {
  if (!isThemeShellPilotPageSlug(slug)) return false;
  return themeShellOptIn(query, pilotLive);
}

export function isThemeShellEnabledForCollectionSlug(
  slug: string,
  query?: ThemeShellPilotQuery,
  pilotLive = process.env.THEME_SHELL_PILOT_LIVE === "1",
): boolean {
  if (!isThemeShellPilotCollectionSlug(slug)) return false;
  return themeShellOptIn(query, pilotLive);
}

export function isThemeShellEnabledForCollectionPath(
  pathname: string,
  query?: ThemeShellPilotQuery,
  pilotLive = process.env.THEME_SHELL_PILOT_LIVE === "1",
): boolean {
  const slug = themeShellCollectionSlugFromPath(pathname);
  if (!slug) return false;
  return isThemeShellEnabledForCollectionSlug(slug, query, pilotLive);
}

export function isThemeShellEnabledForVitrinRoutePath(
  pathname: string,
  query?: ThemeShellPilotQuery,
  pilotLive = process.env.THEME_SHELL_PILOT_LIVE === "1",
): boolean {
  if (!isThemeShellVitrinRoutePath(pathname)) return false;
  return themeShellOptIn(query, pilotLive);
}

export function isThemeShellEnabledForCommercePath(
  pathname: string,
  query?: ThemeShellPilotQuery,
  pilotLive = process.env.THEME_SHELL_PILOT_LIVE === "1",
): boolean {
  if (!isThemeShellCommercePath(pathname)) return false;
  return themeShellOptIn(query, pilotLive);
}

/** Ana sayfa — iframe yerine React kabuk + vitrin bölümleri */
export function isThemeShellEnabledForHomePath(
  pathname: string,
  query?: ThemeShellPilotQuery,
  pilotLive = process.env.THEME_SHELL_PILOT_LIVE === "1",
): boolean {
  if (!isThemeShellHomePath(pathname)) return false;
  return themeShellOptIn(query, pilotLive);
}

/** Ürün PDP — galeri/varyant tema kabuğunda çalışır (pilot live dahil) */
export function isThemeShellEnabledForProductPath(
  pathname: string,
  query?: ThemeShellPilotQuery,
  pilotLive = process.env.THEME_SHELL_PILOT_LIVE === "1",
): boolean {
  if (!isThemeShellProductPath(pathname)) return false;
  return themeShellOptIn(query, pilotLive);
}

export function isThemeShellEnabledForPath(
  pathname: string,
  query?: ThemeShellPilotQuery,
  pilotLive = process.env.THEME_SHELL_PILOT_LIVE === "1",
): boolean {
  if (isThemeShellMinimalChromePath(pathname)) return false;
  if (isThemeShellEnabledForHomePath(pathname, query, pilotLive)) return true;
  if (isThemeShellEnabledForCommercePath(pathname, query, pilotLive)) return true;
  if (isThemeShellEnabledForVitrinRoutePath(pathname, query, pilotLive)) return true;
  const pageSlug = themeShellSlugFromPath(pathname);
  if (pageSlug && isThemeShellEnabledForSlug(pageSlug, query, pilotLive)) return true;
  if (isThemeShellEnabledForCollectionPath(pathname, query, pilotLive)) return true;
  if (isThemeShellEnabledForProductPath(pathname, query, pilotLive)) return true;
  if (isThemeShellEnabledForBlogArticlePath(pathname, query, pilotLive)) return true;
  if (isThemeShellEnabledForPagesPath(pathname, query, pilotLive)) return true;
  return false;
}

/** Çok bölümlü vitrin sayfaları; privacy-policy basit richtext */
export const THEME_SHELL_SECTIONS_PAGE_SLUGS = [
  "about",
  "contact",
  "faq",
  "terms-of-service",
  "refund-policy",
] as const satisfies readonly VitrinPageKey[];

export function isThemeShellSectionsPageSlug(slug: string): boolean {
  return (THEME_SHELL_SECTIONS_PAGE_SLUGS as readonly string[]).includes(slug);
}
