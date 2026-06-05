/**
 * Mirror iframe içindeki eski Shopify SEO kalıntılarını temizler.
 * Dış Next.js sayfası canonical, meta ve JSON-LD kaynağıdır.
 */

const CANONICAL_LINK = /<link\b[^>]*\brel=["']canonical["'][^>]*>/gi;
const HREFLANG_LINK = /<link\b[^>]*\bhreflang\b[^>]*>/gi;
const LD_JSON_SCRIPT = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi;
const OG_META = /<meta\b[^>]*\bproperty=["']og:[^"']*["'][^>]*>/gi;
const TWITTER_META = /<meta\b[^>]*\bname=["']twitter:[^"']*["'][^>]*>/gi;
const DESC_META = /<meta\b[^>]*\bname=["']description["'][^>]*>/gi;
const ROBOTS_META = /<meta\b[^>]*\bname=["']robots["'][^>]*>/gi;
const OEMBED_LINK = /<link\b[^>]*\btype=["']application\/json\+oembed["'][^>]*>/gi;

export function patchMirrorProductSeoStrip(html: string): string {
  let out = html;
  out = out.replace(CANONICAL_LINK, "");
  out = out.replace(HREFLANG_LINK, "");
  out = out.replace(LD_JSON_SCRIPT, "");
  out = out.replace(OG_META, "");
  out = out.replace(TWITTER_META, "");
  out = out.replace(DESC_META, "");
  out = out.replace(ROBOTS_META, "");
  out = out.replace(OEMBED_LINK, "");
  return out;
}

/** iframe yüklendikten sonra çalışma zamanı temizlik */
export function stripSeoFromMirrorDocument(doc: Document): void {
  doc
    .querySelectorAll(
      'link[rel="canonical"], link[hreflang], link[rel="alternate"][hreflang], link[type="application/json+oembed"]',
    )
    .forEach((el) => el.remove());

  doc.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove());

  doc
    .querySelectorAll(
      'meta[property^="og:"], meta[name^="twitter:"], meta[name="description"], meta[name="robots"]',
    )
    .forEach((el) => el.remove());
}
