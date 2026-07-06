/** Mirror iframe — LCP hero + upload görselleri boyutlandır + responsive srcset */

import {
  MIRROR_CARD_IMAGE_WIDTH,
  MIRROR_HERO_TILE_WIDTH,
  MIRROR_MOBILE_LCP_WIDTH,
  isResizableMirrorImageUrl,
  mirrorCdnImageUrl,
} from "@/lib/mirror-cdn-image";
import { MIRROR_EMBED_HERO_CRITICAL_CSS } from "@/lib/mirror-image-reveal";

// Responsive genişlikler — tarayıcı doğru boyutu seçer
const HERO_SRCSET_WIDTHS = [640, 1080, 1440] as const;
const CARD_SRCSET_WIDTHS = [300, 500] as const;

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** CLS — width/height özniteliklerini görüntülenen boyuta indir */
function patchHeroIntrinsicDimensions(attrs: string, displayWidth: number): string {
  const aspectMatch = attrs.match(/data-aspectratio="([^"]+)"/i);
  const aspect = aspectMatch ? Number.parseFloat(aspectMatch[1]!) : 0;
  if (!Number.isFinite(aspect) || aspect <= 0) return attrs;

  const h = Math.max(1, Math.round(displayWidth / aspect));
  let next = attrs.replace(/\swidth="[^"]*"/gi, "");
  next = next.replace(/\sheight="[^"]*"/gi, "");
  return `${next} width="${displayWidth}" height="${h}"`;
}

function buildSrcset(rawUrl: string, widths: readonly number[]): string {
  return widths
    .map((w) => `${escapeHtmlAttr(mirrorCdnImageUrl(rawUrl, w))} ${w}w`)
    .join(", ");
}

type ImageKind = "lcp-hero" | "hero" | "card" | "generic";

function imageKindForTag(attrs: string, isFirstHero: boolean): ImageKind | null {
  if (/product--card-image|collections-tab--image|kn-blog-card-img/i.test(attrs)) {
    return "card";
  }
  if (/media_image|page--banner-img/i.test(attrs)) {
    return isFirstHero ? "lcp-hero" : "hero";
  }
  if (/\/uploads\//i.test(attrs)) return "generic";
  return null;
}

function srcWidthForKind(kind: ImageKind, isFirstHero: boolean): number {
  if (kind === "lcp-hero") return MIRROR_MOBILE_LCP_WIDTH; // <head> preload ile eşleşmeli
  if (kind === "hero" || kind === "generic") return MIRROR_HERO_TILE_WIDTH;
  return MIRROR_CARD_IMAGE_WIDTH;
}

function patchImgTagAttrs(
  attrs: string,
  kind: ImageKind,
  opts?: { isFirstHero?: boolean; lazyCard?: boolean },
): string {
  let next = attrs;

  // src URL'sini bul (data-src değil, sadece src)
  const srcMatch = next.match(/(?<![a-z-])src="([^"]+)"/i);
  const dataSrcMatch = next.match(/data-src="([^"]+)"/i);
  const rawSrc = (srcMatch?.[1] ?? dataSrcMatch?.[1] ?? "").replace(/&amp;/g, "&");

  if (!rawSrc || !isResizableMirrorImageUrl(rawSrc)) return next;

  const baseWidth = srcWidthForKind(kind, opts?.isFirstHero ?? false);
  const baseUrl = mirrorCdnImageUrl(rawSrc.split("?")[0]!, baseWidth);
  const baseUrlEsc = escapeHtmlAttr(baseUrl);

  // src ve data-src güncelle
  next = next.replace(/(?<![a-z-])src="([^"]+)"/i, `src="${baseUrlEsc}"`);
  next = next.replace(/data-src="([^"]+)"/i, `data-src="${baseUrlEsc}"`);

  // data-original temizle (tam boyut referansını kaldır)
  next = next.replace(/data-original="([^"]+)"/i, (_, rawOrig: string) => {
    const path = rawOrig.replace(/&amp;/g, "&").split("?")[0] ?? rawOrig;
    return isResizableMirrorImageUrl(rawOrig) ? `data-original="${escapeHtmlAttr(path)}"` : _;
  });

  // Mevcut srcset ve data-srcset temizle
  next = next.replace(/\s(?:data-)?srcset="[^"]*"/gi, "");
  next = next.replace(/\sdata-sizes="[^"]*"/gi, "");
  next = next.replace(/\ssizes="[^"]*"/gi, "");

  // Responsive srcset ve sizes ekle
  if (kind === "lcp-hero") {
    // Tek boyut — preload ile eşleşir; srcset mobilde 1440 seçimi ve CLS yapar
  } else if (kind === "hero" || kind === "generic") {
    // Lazy hero: lazysizes data-srcset + data-sizes="auto" kullanır
    const srcset = buildSrcset(rawSrc.split("?")[0]!, HERO_SRCSET_WIDTHS);
    next += ` data-srcset="${srcset}" data-sizes="auto"`;
  } else {
    // Kart: lazysizes data-srcset
    const srcset = buildSrcset(rawSrc.split("?")[0]!, CARD_SRCSET_WIDTHS);
    next += ` data-srcset="${srcset}" data-sizes="auto"`;
  }

  // LCP loading ayarları
  next = next.replace(/\slazyload=["'][^"']*["']/gi, "");
  if (opts?.isFirstHero) {
    next = next.replace(/\sloading=["']lazy["']/gi, "");
    if (!/fetchpriority=/i.test(next)) next += ' fetchpriority="high"';
    if (!/\sloading=/i.test(next)) next += ' loading="eager"';
    if (!/elementtiming=/i.test(next)) next += ' elementtiming="kn-hero-lcp"';
  } else if (opts?.lazyCard || /product--card-image|collections-tab--image/i.test(next)) {
    if (!/\sloading=/i.test(next)) next += ' loading="lazy"';
  } else if (/media_image/i.test(next) && !/\sloading=/i.test(next)) {
    next += ' loading="lazy"';
  }

  next = next.replace(/\sdata-kn-sized="[^"]*"/gi, "");
  next += ' data-kn-sized="1"';

  if (kind === "lcp-hero") {
    next = patchHeroIntrinsicDimensions(next, baseWidth);
  }

  return next;
}

/** Sunucu HTML — tema CDN, /uploads ve kart görsellerini responsive srcset ile küçült */
export function patchMirrorResponsiveUploadImages(html: string): string {
  let firstHeroDone = false;
  let out = html.replace(/<img\b([^>]*)>/gi, (full, attrs: string) => {
    const isFirstHero = !firstHeroDone && /media_image/i.test(attrs);
    const kind = imageKindForTag(attrs, isFirstHero);
    if (!kind) return full;
    if (isFirstHero) firstHeroDone = true;
    const next = patchImgTagAttrs(attrs, kind, {
      isFirstHero,
      lazyCard: /product--card-image|collections-tab--image/i.test(attrs),
    });
    return `<img${next}>`;
  });

  out = out.replace(/<noscript>([\s\S]*?)<\/noscript>/gi, (block, inner: string) => {
    const patched = inner.replace(/<img\b([^>]*)>/gi, (full, attrs: string) => {
      const kind = imageKindForTag(attrs, false);
      if (!kind) return full;
      const urlMatch = attrs.match(/(?:(?<![a-z-])src|data-src|data-original)="([^"]+)"/i);
      const raw = urlMatch?.[1]?.replace(/&amp;/g, "&") ?? "";
      if (!raw || !isResizableMirrorImageUrl(raw)) return full;
      return `<img${patchImgTagAttrs(attrs, kind)}>`;
    });
    return `<noscript>${patched}</noscript>`;
  });

  return out;
}

export function patchMirrorCriticalImageLoading(html: string): string {
  let out = html;
  if (!out.includes('id="kn-mirror-embed-critical"')) {
    out = out.replace(
      /<head(\b[^>]*)>/i,
      `<head$1>\n<style id="kn-mirror-embed-critical">${MIRROR_EMBED_HERO_CRITICAL_CSS}</style>`,
    );
  }

  out = patchMirrorResponsiveUploadImages(out);

  // LCP hero preload — ilk media_image (overlay sonrası da çalışır)
  if (!/rel="preload"\s+as="image"/i.test(out)) {
    const heroMatch = out.match(
      /<section[^>]*section-media-grid[^>]*>[\s\S]{0,12000}?<img\b([^>]*class="[^"]*media_image[^"]*"[^>]*)>/i,
    );
    const attrs = heroMatch?.[1] ?? "";
    const originalMatch =
      attrs.match(/data-original="([^"]+)"/i) ?? attrs.match(/(?<![a-z-])src="([^"]+)"/i);
    if (originalMatch?.[1]) {
      const heroUrl = originalMatch[1].replace(/&amp;/g, "&");
      if (isResizableMirrorImageUrl(heroUrl)) {
        const sized = mirrorCdnImageUrl(heroUrl, MIRROR_MOBILE_LCP_WIDTH);
        const preload = `<link rel="preload" as="image" href="${escapeHtmlAttr(sized)}" fetchpriority="high">`;
        out = out.replace(/<head(\b[^>]*)>/i, `<head$1>\n${preload}`);
      }
    }
  }

  return out;
}
