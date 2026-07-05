/**
 * Techizmet Shop mirror CSS — ürün / CMS sayfaları için.
 */
import "@/app/store-theme.css";

const BASE = "/theme/techizmet-shop/cdn/shop/t/5/assets";
const V = "?v=1";

const SHEETS = [
  `${BASE}/swiper-bundle.min3e40.css${V}`,
  `${BASE}/animate5756.css${V}`,
  `${BASE}/base2ff2.css${V}`,
  `${BASE}/componentcd23.css${V}`,
  `${BASE}/theme9bdd.css${V}`,
  `${BASE}/header38c6.css${V}`,
  `${BASE}/footer0e25.css${V}`,
  `${BASE}/announcementf3b9.css${V}`,
  `${BASE}/marquee1a4c.css${V}`,
  `${BASE}/featured-collection2541.css${V}`,
  `${BASE}/main-collection71f4.css${V}`,
  `${BASE}/main-product26e4.css${V}`,
  `${BASE}/testimonialsfb63.css${V}`,
  `${BASE}/cartcfbd.css${V}`,
  `${BASE}/account1dbb.css${V}`,
];

export function StoreThemeStyles() {
  return (
    <>
      {SHEETS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <link rel="stylesheet" href="/theme/techizmet-shop/store-bridge.css" />
      <link rel="stylesheet" href="/theme/techizmet-shop/store-ui-fixes.css?v=44" />
      <link rel="stylesheet" href="/theme/techizmet-shop/mirror-icons-fix.css?v=4" />
      <link rel="stylesheet" href="/theme/techizmet-shop/kn-checkout-embed.css?v=8" />
    </>
  );
}
