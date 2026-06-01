import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALE_COOKIE, resolveLocaleFromRequest, type ShopLocale } from "@/lib/i18n/locale";
import { mirrorStaticRewrite } from "@/lib/mirror-static-rewrite";

function attachLocale(
  response: NextResponse,
  request: NextRequest,
  locale: ShopLocale,
  pathname: string,
) {
  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  if (existing !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  response.headers.set("x-shop-locale", locale);
  response.headers.set("x-pathname", pathname);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_mirror-prebuilt") ||
    pathname.startsWith("/api/theme/cdn")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/theme/")) {
    return NextResponse.next();
  }

  const locale = resolveLocaleFromRequest(request);

  const mirrorRewrite = mirrorStaticRewrite(request, locale);
  if (mirrorRewrite) {
    return attachLocale(mirrorRewrite, request, locale, pathname);
  }

  return attachLocale(NextResponse.next(), request, locale, pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
