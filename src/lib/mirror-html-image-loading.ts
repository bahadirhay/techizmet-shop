/** Mirror iframe — yalnızca LCP hero görseli öne alınır; ürün kartları lazy kalır */

import { MIRROR_LCP_IMAGE_WIDTH, mirrorCdnImageUrl } from "@/lib/mirror-cdn-image";

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function patchMirrorCriticalImageLoading(html: string): string {
  const marker = 'class="lazyload no-js-hidden media_image"';
  const idx = html.indexOf(marker);
  if (idx === -1) return html;

  const heroChunk = html.slice(idx, idx + 1400);
  const originalMatch = heroChunk.match(/data-original="([^"]+)"/i);

  const before = html.slice(0, idx);
  const after = html.slice(idx);
  let out =
    before +
    after.replace(
      /(<img\b[^>]*class="lazyload no-js-hidden media_image"[^>]*)(>)/i,
      (tag, end) => {
        let next = tag.replace(/\sloading=["']lazy["']/gi, "");
        if (!/fetchpriority=/i.test(next)) next += ' fetchpriority="high"';
        if (!/\sloading=/i.test(next)) next += ' loading="eager"';
        return `${next}${end}`;
      },
    );

  if (originalMatch && !/rel="preload"\s+as="image"/i.test(out)) {
    const heroUrl = originalMatch[1].replace(/&amp;/g, "&");
    const sized = mirrorCdnImageUrl(heroUrl, MIRROR_LCP_IMAGE_WIDTH);
    const preload = `<link rel="preload" as="image" href="${escapeHtmlAttr(sized)}" fetchpriority="high">`;
    out = out.replace(/<head(\b[^>]*)>/i, `<head$1>\n${preload}`);
  }

  return out;
}
