import { NextResponse } from "next/server";
import {
  LOCALE_CHOSEN_COOKIE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_SEC,
  isShopLocale,
} from "@/lib/i18n/locale";

export async function POST(req: Request) {
  const body = (await req.json()) as { locale?: string };
  const locale = body.locale;
  if (!isShopLocale(locale)) {
    return NextResponse.json({ error: "Geçersiz dil" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, locale });
  res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  const cookieOptions = {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SEC,
    sameSite: "lax" as const,
  };
  res.cookies.set(LOCALE_COOKIE, locale, cookieOptions);
  // Ziyaretçinin kendi seçimi olduğunu işaretler; proxy bu işaret olmadan Türkçe döner.
  res.cookies.set(LOCALE_CHOSEN_COOKIE, "1", cookieOptions);
  return res;
}
