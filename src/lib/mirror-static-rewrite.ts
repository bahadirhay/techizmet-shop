import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ShopLocale } from "@/lib/i18n/locale";

const PUBLIC_MIRROR = "/theme/king-noor/mirror";

/** build-mirror-* script çıktıları ile uyumlu (edge middleware — fs yok) */
const COLLECTION_SLUGS = new Set([
  "all",
  "facial-boosters",
  "glow-essentials",
  "luxe-skincare",
  "moisture-magic",
  "natural-glam",
  "pure-by-nature",
]);

const PAGE_SLUGS = new Set(["about", "contact", "faq"]);

/** mirror-product-variants.json anahtarları */
const PRODUCT_SLUGS = new Set([
  "24hr-smudge-proof-mascara",
  "anti-cellulite-body-oil",
  "berry-tint-lip-balm",
  "creamy-foundation-for-all-skin-types",
  "daily-use-face-moisturizer",
  "dewmist-hydrating-makeup-fixer",
  "dual-contour-bronzer-set",
  "flawless-silkskin-foundation",
  "floral-eau-de-parfum-long-lasting",
  "hydrasilk-skin-reviving-cleanser",
  "hydrasoft-face-moisturizer",
  "hydrating-shampoo-for-soft-smooth-hair",
  "liquid-foundation-spf-30",
  "long-lasting-make-up-fixer",
  "micro-sculpting-moisturizer",
  "skinglow-moisture-boost-serum",
  "smooth-finish-hd-concealer",
  "spectrum-sunscreen-spf-50",
  "ultra-fine-hydration-mist",
  "vitamin-c-hyaluronic-acid-radiant-serum",
]);

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
