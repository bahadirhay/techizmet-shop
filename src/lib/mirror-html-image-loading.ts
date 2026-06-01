/** Mirror iframe — lazy-load kaldır; LCP görselleri öne al */

export function patchMirrorCriticalImageLoading(html: string): string {
  let out = html.replace(/\sloading=["']lazy["']/gi, "");
  out = out.replace(
    /(<img\b[^>]*class="[^"]*(?:page--banner-img|collection--card-image|product--card-image|media-grid)[^"]*"[^>]*)(>)/gi,
    (tag, _prefix, end) => {
      if (/fetchpriority=/i.test(tag)) return tag + end;
      return `${tag} fetchpriority="high"${end}`;
    },
  );
  return out;
}
