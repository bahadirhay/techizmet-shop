/** Mirror iframe — LCP hero + upload görselleri boyutlandır */

import {
  MIRROR_CARD_IMAGE_WIDTH,
  MIRROR_HERO_TILE_WIDTH,
  MIRROR_LCP_IMAGE_WIDTH,
  MIRROR_MOBILE_LCP_WIDTH,
  isResizableMirrorImageUrl,
  mirrorCdnImageUrl,
} from "@/lib/mirror-cdn-image";

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function imageWidthForTag(attrs: string, isFirstHero: boolean): number | null {
  if (/product--card-image|collections-tab--image|kn-blog-card-img/i.test(attrs)) {
    return MIRROR_CARD_IMAGE_WIDTH;
  }
  if (/media_image|page--banner-img/i.test(attrs)) {
    return isFirstHero ? MIRROR_MOBILE_LCP_WIDTH : MIRROR_HERO_TILE_WIDTH;
  }
  if (/\/uploads\//i.test(attrs)) return MIRROR_HERO_TILE_WIDTH;
  return null;
}

function patchImgAttrUrl(attrs: string, attr: string, width: number): string {
  const re = new RegExp(`${attr}="([^"]+)"`, "i");
  const m = attrs.match(re);
  if (!m?.[1]) return attrs;
  const raw = m[1].replace(/&amp;/g, "&");
  if (!isResizableMirrorImageUrl(raw)) return attrs;
  const sized = mirrorCdnImageUrl(raw, width);
  return attrs.replace(re, `${attr}="${escapeHtmlAttr(sized)}"`);
}

/** Sunucu HTML — /uploads ve /api/media görsellerini küçült */
export function patchMirrorResponsiveUploadImages(html: string): string {
  let firstHeroDone = false;
  return html.replace(/<img\b([^>]*)>/gi, (full, attrs: string) => {
    const isFirstHero = !firstHeroDone && /media_image/i.test(attrs);
    const width = imageWidthForTag(attrs, isFirstHero);
    if (!width) return full;
    if (isFirstHero) firstHeroDone = true;

    let next = attrs;
    for (const attr of ["src", "data-src"]) {
      next = patchImgAttrUrl(next, attr, width);
    }
    const originalMatch = next.match(/data-original="([^"]+)"/i);
    if (originalMatch) {
      const raw = originalMatch[1].replace(/&amp;/g, "&");
      if (isResizableMirrorImageUrl(raw)) {
        next = next.replace(
          /data-original="[^"]+"/i,
          `data-original="${escapeHtmlAttr(raw.split("?")[0] ?? raw)}"`,
        );
      }
    }
    if (isFirstHero) {
      next = next.replace(/\sloading=["']lazy["']/gi, "");
      if (!/fetchpriority=/i.test(next)) next += ' fetchpriority="high"';
      if (!/\sloading=/i.test(next)) next += ' loading="eager"';
    } else if (/product--card-image|collections-tab--image/i.test(next)) {
      if (!/\sloading=/i.test(next)) next += ' loading="lazy"';
    } else if (/media_image/i.test(next) && !/\sloading=/i.test(next)) {
      next += ' loading="lazy"';
    }
    next = next.replace(/\ssrcset="[^"]*"/gi, "");
    if (!/\bdata-kn-sized=/i.test(next)) next += ' data-kn-sized="1"';
    return `<img${next}>`;
  });
}

export function patchMirrorCriticalImageLoading(html: string): string {
  let out = patchMirrorResponsiveUploadImages(html);

  const marker = 'class="lazyload no-js-hidden media_image"';
  const idx = out.indexOf(marker);
  if (idx === -1) return out;

  const heroChunk = out.slice(idx, idx + 1400);
  const originalMatch = heroChunk.match(/data-original="([^"]+)"/i);

  if (originalMatch && !/rel="preload"\s+as="image"/i.test(out)) {
    const heroUrl = originalMatch[1].replace(/&amp;/g, "&");
    const sized = mirrorCdnImageUrl(heroUrl, MIRROR_MOBILE_LCP_WIDTH);
    const preload = `<link rel="preload" as="image" href="${escapeHtmlAttr(sized)}" fetchpriority="high">`;
    out = out.replace(/<head(\b[^>]*)>/i, `<head$1>\n${preload}`);
  }

  return out;
}
