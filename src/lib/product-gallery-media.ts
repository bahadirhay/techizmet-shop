import { detectEmbedProvider, toVideoIframeSrc } from "@/lib/video-embed";

function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Instagram Reels / YouTube / Vimeo veya yerel MP4 */
export function isEmbeddableProductVideoUrl(url: string): boolean {
  return Boolean(toVideoIframeSrc(url.trim()));
}

export function productVideoEmbedProvider(url: string) {
  return detectEmbedProvider(url.trim());
}

function galleryEmbedHtml(embedSrc: string, pageUrl: string, title?: string): string {
  const safeSrc = escAttr(embedSrc);
  const safeUrl = escAttr(pageUrl.trim());
  const safeTitle = escAttr(title ?? "Video");
  return `<div class="kn-product-gallery-embed" data-embed-url="${safeUrl}">
    <iframe src="${safeSrc}" title="${safeTitle}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
  </div>`;
}

/** PDP ana galeri slaytı — yerinde oynatılabilir video veya embed */
export function productGalleryMainVideoInnerHtml(url: string, title?: string): string {
  const raw = url.trim();
  const embedSrc = toVideoIframeSrc(raw);
  if (embedSrc) return galleryEmbedHtml(embedSrc, raw, title);
  const safeUrl = escAttr(raw);
  return `<video src="${safeUrl}" controls playsinline muted loop preload="metadata"></video>`;
}

/** Zoom popup slaytı */
export function productGalleryZoomVideoInnerHtml(url: string, title?: string): string {
  const raw = url.trim();
  const embedSrc = toVideoIframeSrc(raw);
  if (embedSrc) return galleryEmbedHtml(embedSrc, raw, title);
  const safeUrl = escAttr(raw);
  return `<video src="${safeUrl}" controls playsinline style="width:100%;height:100%;object-fit:contain;"></video>`;
}

/** Admin küçük önizleme — thumbnail şeridi yerine simge */
export function productGalleryThumbEmbedPlaceholderHtml(label = "Video"): string {
  return `<div class="kn-product-thumb-embed" aria-hidden="true">
    <span class="kn-product-thumb-embed__icon">▶</span>
    <span class="kn-product-thumb-embed__label">${escAttr(label)}</span>
  </div>`;
}

export function embedVideoThumbLabel(url: string): string {
  const provider = productVideoEmbedProvider(url);
  if (provider === "instagram") return "Reels";
  if (provider === "youtube") return "YouTube";
  if (provider === "vimeo") return "Vimeo";
  return "Video";
}
