import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALE_COOKIE, resolveLocaleFromRequest, type ShopLocale } from "@/lib/i18n/locale";
import {
  ADMIN_SESSION_COOKIE,
  isMaintenanceBypassPath,
} from "@/lib/maintenance-mode";
import { mirrorStaticRewrite } from "@/lib/mirror-static-rewrite";
import { vitrinPageKeyFromMirrorFileRel } from "@/lib/mirror-vitrin-pages";
import { isDemoShopHost, normalizeRequestHost, resolveStoreHostTenant } from "@/lib/store-tenant-hosts";

/** Edge örneği başına — her istekte /api/site/maintenance çağrısını önler */
let maintenanceCache: { at: number; enabled: boolean } | null = null;
const MAINTENANCE_CACHE_MS = 60_000;

function shopHostRequestHeaders(request: NextRequest, locale?: ShopLocale): Headers {
  const host = normalizeRequestHost(request.headers.get("host") ?? "");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-shop-host", host);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  if (locale) {
    requestHeaders.set("x-shop-locale", locale);
  }

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

function nextWithLocaleRequest(request: NextRequest, locale: ShopLocale): NextResponse {
  return NextResponse.next({ request: { headers: shopHostRequestHeaders(request, locale) } });
}

function attachLocale(
  response: NextResponse,
  request: NextRequest,
  locale: ShopLocale,
  pathname: string,
) {
  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  const localeCookieChanged = existing !== locale;
  if (localeCookieChanged) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  response.headers.set("x-shop-locale", locale);
  response.headers.set("x-pathname", pathname);
  if (isVitrinShellPath(pathname)) {
    response.headers.set("Vary", "Cookie");
    response.headers.set("Vercel-CDN-Cache-Control", VITRIN_SHELL_EDGE_CACHE);
  }
  return response;
}

function attachLocaleOnNext(request: NextRequest, locale: ShopLocale, pathname: string) {
  return attachLocale(nextWithLocaleRequest(request, locale), request, locale, pathname);
}

async function isStoreInMaintenance(request: NextRequest): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return false;
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.at < MAINTENANCE_CACHE_MS) {
    return maintenanceCache.enabled;
  }
  try {
    const url = new URL("/api/site/maintenance", request.url);
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return false;
    const data = (await res.json()) as { enabled?: boolean };
    const enabled = data.enabled === true;
    maintenanceCache = { at: now, enabled };
    return enabled;
  } catch {
    return maintenanceCache?.enabled ?? false;
  }
}

const APEX_TO_WWW: Record<string, string> = {
  "anatolianpaw.com": "www.anatolianpaw.com",
};

/** Vitrin RSC — edge CDN locale ile güvenli değil; next.config no-store kullanır */
const VITRIN_SHELL_EDGE_CACHE = "private, no-store";

function isVitrinShellPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/sokak-dostlari") return true;
  if (pathname === "/collections" || pathname.startsWith("/collections/")) return true;
  if (pathname.startsWith("/products/")) return true;
  if (pathname === "/blogs/news" || pathname.startsWith("/blogs/news/")) return true;
  if (pathname.startsWith("/pages/")) return true;
  return false;
}

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
    if (pathname.endsWith("/manifest.json")) {
      return nextWithLocaleRequest(request, resolveLocaleFromRequest(request));
    }
    if (isDemoShopHost(host)) {
      const locale = resolveLocaleFromRequest(request);
      const rel = pathname.replace(/^\/_mirror-prebuilt\//, "");
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = "/api/vitrin/mirror";
      const q = new URLSearchParams({ path: rel });
      const pageKey = vitrinPageKeyFromMirrorFileRel(rel);
      if (pageKey) q.set("pageKey", pageKey);
      rewriteUrl.search = q.toString();
      return NextResponse.rewrite(rewriteUrl, {
        request: { headers: shopHostRequestHeaders(request, locale) },
      });
    }
    return nextWithLocaleRequest(request, resolveLocaleFromRequest(request));
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/locale") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/theme/cdn")
  ) {
    const response = nextWithLocaleRequest(request, resolveLocaleFromRequest(request));
    return response;
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
    return nextWithLocaleRequest(request, resolveLocaleFromRequest(request));
  }

  const locale = resolveLocaleFromRequest(request);

  // Amazon görsel crawler — locale çerezi ve Vary:Cookie gönderme
  if (
    pathname.startsWith("/api/amazon-image/") ||
    (pathname.startsWith("/api/media/") && request.nextUrl.searchParams.get("amazon") === "1")
  ) {
    return nextWithLocaleRequest(request, locale);
  }

  const mirrorRewrite = mirrorStaticRewrite(request, locale);
  if (mirrorRewrite) {
    return attachLocale(mirrorRewrite, request, locale, pathname);
  }

  return attachLocaleOnNext(request, locale, pathname);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|BingSiteAuth\\.xml|indexnow-key\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|css|txt)$).*)",
  ],
};
