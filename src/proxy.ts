import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALE_COOKIE, resolveLocaleFromRequest, type ShopLocale } from "@/lib/i18n/locale";
import {
  ADMIN_SESSION_COOKIE,
  isMaintenanceBypassPath,
} from "@/lib/maintenance-mode";
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

async function isStoreInMaintenance(request: NextRequest): Promise<boolean> {
  try {
    const url = new URL("/api/site/maintenance", request.url);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { enabled?: boolean };
    return data.enabled === true;
  } catch {
    return false;
  }
}

const APEX_TO_WWW: Record<string, string> = {
  "anatolianpaw.com": "www.anatolianpaw.com",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const host = request.headers.get("host")?.toLowerCase().split(":")[0] ?? "";
  const wwwHost = APEX_TO_WWW[host];
  if (wwwHost) {
    const url = request.nextUrl.clone();
    url.host = wwwHost;
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_mirror-prebuilt") ||
    pathname.startsWith("/api/theme/cdn")
  ) {
    return NextResponse.next();
  }

  if (
    !isMaintenanceBypassPath(pathname) &&
    !request.cookies.get(ADMIN_SESSION_COOKIE)?.value &&
    (await isStoreInMaintenance(request))
  ) {
    const locale = resolveLocaleFromRequest(request);
    const bakim = request.nextUrl.clone();
    bakim.pathname = "/bakim";
    bakim.search = "";
    const redirect = NextResponse.redirect(bakim);
    return attachLocale(redirect, request, locale, pathname);
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
