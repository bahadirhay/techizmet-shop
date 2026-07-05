import { cookies, headers } from "next/headers";
import {
  LOCALE_COOKIE,
  localeFromCookieValue,
  type ShopLocale,
} from "@/lib/i18n/locale";

export async function getStoreLocaleFromHeaders(): Promise<ShopLocale> {
  const h = await headers();
  const fromHeader = localeFromCookieValue(h.get("x-shop-locale") ?? undefined);
  if (fromHeader) return fromHeader;

  const jar = await cookies();
  const fromCookie = localeFromCookieValue(jar.get(LOCALE_COOKIE)?.value);
  if (fromCookie) return fromCookie;
  return "tr";
}

export async function getStoreLocale(): Promise<ShopLocale> {
  const h = await headers();
  const fromHeader = localeFromCookieValue(h.get("x-shop-locale") ?? undefined);
  if (fromHeader) return fromHeader;

  const jar = await cookies();
  const fromCookie = localeFromCookieValue(jar.get(LOCALE_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  return "tr";
}
