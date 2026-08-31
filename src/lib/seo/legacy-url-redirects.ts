/**
 * Google Search Console / eski Shopify şablonu URL'leri → kalıcı 301.
 * next.config redirects() bu listeyi kullanır.
 */

export type NextLegacyRedirect = {
  source: string;
  destination: string;
  permanent: boolean;
};

/** Kozmetik demo şablon ürün slug'ları — Anatolian Paw kataloğunda yok */
export const LEGACY_THEME_PRODUCT_SLUGS = [
  "24hr-smudge-proof-mascara",
  "anti-cellulite-body-oil",
  "berry-tint-lip-balm",
  "creamy-foundation-for-all-skin-types",
  "daily-use-face-moisturizer",
  "dewmist-hydrating-makeup-fixer",
  "ultra-fine-hydration-mist",
] as const;

/** Kozmetik demo şablon koleksiyon slug'ları */
export const LEGACY_THEME_COLLECTION_SLUGS = [
  "luxe-skincare",
  "facial-boosters",
  "glow-essentials",
  "glow-begins-here",
  "organic-skincare",
  "skincare-collection",
  "skincare-picks",
  "our-skincare-picks",
] as const;

const LEGACY_PRODUCT_DEST = "/collections/all";
const LEGACY_COLLECTION_DEST = "/collections/all";

export function buildLegacySeoRedirects(): NextLegacyRedirect[] {
  const out: NextLegacyRedirect[] = [
    { source: "/products", destination: LEGACY_PRODUCT_DEST, permanent: true },
    { source: "/blog", destination: "/blogs/news", permanent: true },
    { source: "/blog/:slug.html", destination: "/blogs/news/:slug", permanent: true },
    { source: "/blog/:slug", destination: "/blogs/news/:slug", permanent: true },
    { source: "/&", destination: "/", permanent: true },
  ];

  for (const slug of LEGACY_THEME_PRODUCT_SLUGS) {
    out.push({
      source: `/products/${slug}`,
      destination: LEGACY_PRODUCT_DEST,
      permanent: true,
    });
    out.push({
      source: `/products/${slug}.html`,
      destination: LEGACY_PRODUCT_DEST,
      permanent: true,
    });
  }

  for (const slug of LEGACY_THEME_COLLECTION_SLUGS) {
    out.push({
      source: `/collections/${slug}`,
      destination: LEGACY_COLLECTION_DEST,
      permanent: true,
    });
    out.push({
      source: `/collections/${slug}.html`,
      destination: LEGACY_COLLECTION_DEST,
      permanent: true,
    });
  }

  return out;
}

/** Mirror HTML içindeki eski şablon href'lerini canlı rotalara çevirir */
export function rewriteLegacyThemeHrefsInHtml(html: string): string {
  let out = html;
  for (const slug of LEGACY_THEME_PRODUCT_SLUGS) {
    out = out.replaceAll(`href="/products/${slug}"`, `href="${LEGACY_PRODUCT_DEST}"`);
    out = out.replaceAll(`href="/products/${slug}.html"`, `href="${LEGACY_PRODUCT_DEST}"`);
  }
  for (const slug of LEGACY_THEME_COLLECTION_SLUGS) {
    out = out.replaceAll(`href="/collections/${slug}"`, `href="${LEGACY_COLLECTION_DEST}"`);
    out = out.replaceAll(`href="/collections/${slug}.html"`, `href="${LEGACY_COLLECTION_DEST}"`);
  }
  out = out.replaceAll('href="/blog/', 'href="/blogs/news/');
  return out;
}
