import { NextResponse } from "next/server";
import { LOCALE_COOKIE, isShopLocale } from "@/lib/i18n/locale";

export async function POST(req: Request) {
  const body = (await req.json()) as { locale?: string };
  const locale = body.locale;
  if (!isShopLocale(locale)) {
    return NextResponse.json({ error: "Geçersiz dil" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
