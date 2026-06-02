import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";

export const MEGA_TILE_IMG_SELECTOR =
  ".kn-nav-mega__tile-img[style], .kn-nav-mega__product-img[style]";

export function extractBgImageUrl(styleValue: string): string | null {
  const m = styleValue.match(/url\((['"]?)(.*?)\1\)/i);
  const raw = m?.[2]?.trim();
  return raw || null;
}

/** Mega menü kampanya görselleri — ürün kartı görselleri hariç */
export function collectMegaPromoImageUrls(nav: ResolvedNavItem[]): string[] {
  const urls = new Set<string>();
  for (const it of nav) {
    const mega = it.mega;
    if (!mega) continue;
    const candidates = [
      mega.featuredImageUrl,
      mega.featuredImageUrl2,
      mega.featuredSecondaryImageUrl,
      mega.promoImageUrl,
      mega.promoImageUrl2,
    ];
    for (const raw of candidates) {
      const u = raw?.trim();
      if (!u || !u.startsWith("/")) continue;
      if (/^\/(?:api|_next|theme)\//i.test(u)) continue;
      urls.add(u);
    }
  }
  return [...urls].slice(0, 16);
}

export function buildMegaImagePreloadHeadHtml(urls: string[]): string {
  if (!urls.length) return "";
  return urls
    .map(
      (href) =>
        `<link rel="preload" as="image" href="${href.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" fetchpriority="low">`,
    )
    .join("\n");
}

export function preloadMegaImagesInRoot(
  doc: Document,
  root: ParentNode,
  priority: "high" | "low" = "low",
) {
  const win = doc.defaultView as (Window & { __knMegaImagePreloaded?: Set<string> }) | null;
  if (!win) return;
  if (!win.__knMegaImagePreloaded) {
    win.__knMegaImagePreloaded = new Set<string>();
  }
  const seen = win.__knMegaImagePreloaded;

  root.querySelectorAll(MEGA_TILE_IMG_SELECTOR).forEach((el) => {
    const style = el.getAttribute("style") ?? "";
    const src = extractBgImageUrl(style);
    if (!src || seen.has(src)) return;
    seen.add(src);
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    if (priority === "high") {
      try {
        img.fetchPriority = "high";
      } catch {
        /* eski tarayıcı */
      }
    }
    img.src = src;
  });
}

export function preloadMegaForNavItem(doc: Document, li: HTMLElement) {
  const id = li.dataset.knNavMegaId;
  if (!id) {
    preloadMegaImagesInRoot(doc, doc, "high");
    return;
  }
  const safeId = id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const mega = doc.querySelector(
    `#kn-mega-host .kn-nav-dropdown--fruitser[data-kn-nav-mega-id="${safeId}"]`,
  );
  if (mega) preloadMegaImagesInRoot(doc, mega, "high");
}

export function warmAllMegaImages(doc: Document) {
  preloadMegaImagesInRoot(doc, doc, "low");
}
