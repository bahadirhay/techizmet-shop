import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALE_COOKIE, resolveLocaleFromRequest } from "@/lib/i18n/locale";
import { mirrorStaticRewrite } from "@/lib/mirror-static-rewrite";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/_next") ||
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
    mirrorRewrite.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    mirrorRewrite.headers.set("x-shop-locale", locale);
    mirrorRewrite.headers.set("x-pathname", pathname);
    return mirrorRewrite;
  }

  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  response.headers.set("x-shop-locale", locale);
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
