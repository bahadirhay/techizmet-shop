import type { NextRequest } from "next/server";

export type ShopLocale = "tr" | "en";

export const LOCALE_COOKIE = "shop_locale";

/**
 * Ziyaretçi dili kendisi seçtiğinde yazılır (`/api/locale`, dil düğmeleri).
 * `shop_locale` çerezi eskiden IP'ye göre otomatik de yazıldığı için tek başına
 * "kullanıcı seçti" anlamına gelmez; bu işaret olmadan seçim sayılmaz.
 */
export const LOCALE_CHOSEN_COOKIE = "shop_locale_set";

export const LOCALE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

export function isShopLocale(v: string | undefined | null): v is ShopLocale {
  return v === "tr" || v === "en";
}

/**
 * Varsayılan dil Türkçe; başka dil yalnızca ziyaretçi kendisi seçtiyse.
 *
 * Aynı adresin IP ülkesine göre farklı dilde dönmesi arama motorlarını yanıltıyordu:
 * Googlebot ve yapay zekâ botları çoğunlukla Türkiye dışından tarar ve Türkçe
 * sayfaların İngilizce sürümünü (`lang="en"`, İngilizce başlık) görüyordu.
 */
export function resolveLocaleFromRequest(req: NextRequest): ShopLocale {
  const stored = req.cookies.get(LOCALE_COOKIE)?.value;
  const chosen = req.cookies.get(LOCALE_CHOSEN_COOKIE)?.value === "1";
  if (chosen && isShopLocale(stored)) return stored;
  return "tr";
}

/** Eski davranış (demo mağaza): manuel çerez, yoksa IP ülkesi + tarayıcı dili. */
export function resolveLocaleFromRequestByGeo(req: NextRequest): ShopLocale {
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

/** İstemci — ziyaretçinin dil seçimini anında yazar (API round-trip gerekmez) */
export function writeShopLocaleCookie(locale: ShopLocale): void {
  const attrs = `path=/; max-age=${LOCALE_COOKIE_MAX_AGE_SEC}; samesite=lax`;
  document.cookie = `${LOCALE_COOKIE}=${locale}; ${attrs}`;
  document.cookie = `${LOCALE_CHOSEN_COOKIE}=1; ${attrs}`;
}
