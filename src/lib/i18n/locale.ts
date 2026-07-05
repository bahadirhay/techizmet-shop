import type { NextRequest } from "next/server";

export type ShopLocale = "tr" | "en";

export const LOCALE_COOKIE = "shop_locale";

export function isShopLocale(v: string | undefined | null): v is ShopLocale {
  return v === "tr" || v === "en";
}

/** IP (ülke) + tarayıcı dili; manuel çerez seçimi öncelikli */
export function resolveLocaleFromRequest(req: NextRequest): ShopLocale {
  const manual = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isShopLocale(manual)) return manual;

  const country =
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("x-country-code") ??
    "";

  if (country.toUpperCase() === "TR") return "tr";

  const accept = (req.headers.get("accept-language") ?? "").toLowerCase();
  if (accept.startsWith("tr") || /[,;]\s*tr\b/.test(accept)) return "tr";

  return "en";
}

export function localeFromCookieValue(raw: string | undefined): ShopLocale | null {
  return isShopLocale(raw) ? raw : null;
}

/** İstemci — SSR `lang` / `data-shop-locale` öncelikli */
export function readShopLocaleFromDocument(doc: Document): ShopLocale {
  const fromAttr = doc.documentElement.getAttribute("data-shop-locale");
  if (isShopLocale(fromAttr)) return fromAttr;
  const lang = doc.documentElement.lang?.toLowerCase() ?? "";
  if (lang.startsWith("en")) return "en";
  return "tr";
}

const LOCALE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

/** İstemci — dil çerezini anında yazar (API round-trip gerekmez) */
export function writeShopLocaleCookie(locale: ShopLocale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE_SEC}; samesite=lax`;
}
