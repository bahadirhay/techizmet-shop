import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ShopLocale } from "@/lib/i18n/locale";

const PUBLIC_MIRROR = "/theme/techizmet-shop/mirror";

const COLLECTION_SLUGS = new Set<string>();

const PAGE_SLUGS = new Set([
  "about",
  "contact",
  "faq",
  "privacy-policy",
  "terms-of-service",
  "refund-policy",
]);

const PRODUCT_SLUGS = new Set<string>();

function rewriteTo(request: NextRequest, publicPath: string) {
  return NextResponse.rewrite(new URL(publicPath, request.url));
}

/**
 * Eski: middleware doğrudan mirror HTML rewrite ediyordu — admin CMS kayıtları vitrine yansımıyordu.
 * Vitrin artık app/(store)/* + settings.theme.homepageMode (mirror | blocks) ile yönetilir.
 */
export function mirrorStaticRewrite(
  _request: NextRequest,
  _locale: ShopLocale,
): NextResponse | null {
  return null;
}
