import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALE_COOKIE, resolveLocaleFromRequest, type ShopLocale } from "@/lib/i18n/locale";
import {
  ADMIN_SESSION_COOKIE,
  isMaintenanceBypassPath,
} from "@/lib/maintenance-mode";
import { mirrorStaticRewrite } from "@/lib/mirror-static-rewrite";
import { isDemoShopHost, normalizeRequestHost, resolveStoreHostTenant } from "@/lib/store-tenant-hosts";

function shopHostRequestHeaders(request: NextRequest): Headers {
  const host = normalizeRequestHost(request.headers.get("host") ?? "");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-shop-host", host);

  const tenant = resolveStoreHostTenant(host);
  if (tenant) {
    requestHeaders.set("x-store-tenant-slug", tenant.slug);
    requestHeaders.set("x-store-public-origin", tenant.publicOrigin);
    if (tenant.databaseUrlEnv) {
      requestHeaders.set("x-store-database-url-env", tenant.databaseUrlEnv);
    }
  }

  return requestHeaders;
}

function nextWithShopHost(request: NextRequest): NextResponse {
  return NextResponse.next({ request: { headers: shopHostRequestHeaders(request) } });
}

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

function attachLocaleOnNext(request: NextRequest, locale: ShopLocale, pathname: string) {
  return attachLocale(nextWithShopHost(request), request, locale, pathname);
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
  const host = normalizeRequestHost(request.headers.get("host") ?? "");

  const wwwHost = APEX_TO_WWW[host];
  if (wwwHost) {
    const url = request.nextUrl.clone();
    url.host = wwwHost;
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  if (pathname.startsWith("/_mirror-prebuilt")) {
    if (isDemoShopHost(host)) {
      const rel = pathname.replace(/^\/_mirror-prebuilt\//, "");
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = "/api/vitrin/mirror";
      rewriteUrl.search = `path=${encodeURIComponent(rel)}`;
      return NextResponse.rewrite(rewriteUrl, {
        request: { headers: shopHostRequestHeaders(request) },
      });
    }
    return nextWithShopHost(request);
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/theme/cdn")
  ) {
    return nextWithShopHost(request);
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
    return nextWithShopHost(request);
  }

  const locale = resolveLocaleFromRequest(request);

  const mirrorRewrite = mirrorStaticRewrite(request, locale);
  if (mirrorRewrite) {
    return attachLocale(mirrorRewrite, request, locale, pathname);
  }

  return attachLocaleOnNext(request, locale, pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
