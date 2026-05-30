import { readMirrorProductHtml } from "@/lib/mirror-product-content";

/** Vitrin PDP ana galeri (swiper) görselleri — sırayla */
export function extractProductGalleryImages(html: string): string[] {
  const galleryMatch = html.match(
    /data-product-media="main-media[\s\S]*?class="swiper--button-wrapper"/i,
  );
  if (!galleryMatch) return [];

  const urls: string[] = [];
  const re =
    /<img[^>]+src="(\/theme\/king-noor\/cdn\/shop\/files\/[^"?]+)/gi;
  for (const m of galleryMatch[0].matchAll(re)) {
    const path = m[1].split("?")[0];
    if (!urls.includes(path)) urls.push(path);
  }
  return urls;
}

export function loadMirrorProductImages(slug: string): string[] {
  const html = readMirrorProductHtml(slug);
  if (!html) return [];
  const gallery = extractProductGalleryImages(html);
  if (gallery.length) return gallery;

  const og = html.match(
    /property="og:image"[^>]*content="[^"]*\/files\/([^"?]+)/i,
  );
  if (og) return [`/theme/king-noor/cdn/shop/files/${og[1].split("?")[0]}`];
  return [];
}
