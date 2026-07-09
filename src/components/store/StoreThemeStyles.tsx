/**
 * Techizmet Shop mirror CSS — ürün / CMS sayfaları için.
 */
import "@/app/store-theme.css";
import { FIXES_CSS_VERSION } from "@/lib/mirror-store-ui-fix";

const BASE = "/theme/techizmet-shop/cdn/shop/t/5/assets";
const V = "?v=1";

const CORE_SHEETS: string[] = [
  `${BASE}/swiper-bundle.min3e40.css${V}`,
  `${BASE}/base2ff2.css${V}`,
  `${BASE}/componentcd23.css${V}`,
  `${BASE}/theme9bdd.css${V}`,
  `${BASE}/header38c6.css${V}`,
  `${BASE}/footer0e25.css${V}`,
  `${BASE}/announcementf3b9.css${V}`,
  `${BASE}/marquee1a4c.css${V}`,
  `${BASE}/cartcfbd.css${V}`,
  `${BASE}/account1dbb.css${V}`,
];

const OPTIONAL_SHEETS = {
  animate: `${BASE}/animate5756.css${V}`,
  featuredCollection: `${BASE}/featured-collection2541.css${V}`,
  mainCollection: `${BASE}/main-collection71f4.css${V}`,
  mainProduct: `${BASE}/main-product26e4.css${V}`,
  testimonials: `${BASE}/testimonialsfb63.css${V}`,
} as const;

function sheetsForPath(pathname: string): string[] {
  const isProduct = pathname.startsWith("/products/");
  const isCollection = pathname.startsWith("/collections/");
  const sheets = [...CORE_SHEETS];
  if (!isProduct) sheets.push(OPTIONAL_SHEETS.animate);
  if (!isProduct) sheets.push(OPTIONAL_SHEETS.featuredCollection);
  if (isCollection || (!isProduct && !pathname.startsWith("/blogs/"))) {
    sheets.push(OPTIONAL_SHEETS.mainCollection);
  }
  if (isProduct) sheets.push(OPTIONAL_SHEETS.mainProduct);
  if (!isProduct) sheets.push(OPTIONAL_SHEETS.testimonials);
  return sheets;
}

export function StoreThemeStyles({ pathname = "/" }: { pathname?: string }) {
  const sheets = sheetsForPath(pathname);
  return (
    <>
      {sheets.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <link rel="stylesheet" href="/theme/techizmet-shop/store-bridge.css" />
      <link rel="stylesheet" href={`/theme/techizmet-shop/store-ui-fixes.css?v=${FIXES_CSS_VERSION}`} />
      <link rel="stylesheet" href="/theme/techizmet-shop/mirror-icons-fix.css?v=4" />
      <link rel="stylesheet" href="/theme/techizmet-shop/kn-checkout-embed.css?v=8" />
    </>
  );
}
