import { readMirrorPageHtml } from "@/lib/mirror-page-html";
import { extractMediaGridItemsFromHtml } from "@/lib/mirror-media-grid";
import { extractCollectionGridColumnsFromHtml } from "@/lib/mirror-collection-list-grid";
import { extractProductGridColumnsFromHtml } from "@/lib/mirror-product-grid";
import { extractCollectionsTabDefaults } from "@/lib/mirror-collections-tab-server";
import { extractShopTheLookDefaults } from "@/lib/mirror-shop-the-look-server";
import { extractFeaturedBlogPostsFromHtml } from "@/lib/mirror-featured-blog";
import { extractVideoSectionFromHtml } from "@/lib/mirror-video-section";
import { extractScrollingCollectionsFromHtml } from "@/lib/mirror-scrolling-collections-section";
import { extractTrendingProductsFromHtml } from "@/lib/mirror-trending-products-section";
import { extractTestimonialFromHtml } from "@/lib/mirror-testimonial-section";
import type { MirrorPageSection } from "@/lib/mirror-home-overlay";
import type { VitrinPageKey } from "@/lib/mirror-vitrin-pages";

export type { MirrorPageSection } from "@/lib/mirror-home-overlay";

const LABELS: Record<string, string> = {
  "media-grid": "Hero / Görsel grid",
  "featured-collection": "Öne çıkan ürünler",
  "scrolling-collections": "Koleksiyon şeridi",
  "collections-tab": "Koleksiyon sekmeleri",
  "trending-products": "Trend ürünler",
  "testimonial": "Müşteri yorumları",
  "shop-the-look": "Yüz hotspot (Shop the look)",
  "best-selling-products": "Çok satanlar",
  "categories": "Kategoriler",
  "richtext": "Metin bloğu",
  "collections-grid": "EXPLORE / Koleksiyon grid",
  "marquee": "Kampanya şeridi",
  "image-with-text": "Görsel + metin",
  "featured-blog": "Blog",
  "main-blog": "Blog listesi",
  "media-gallery": "Galeri",
  "revealing-text": "Animasyonlu metin",
  "page-banner": "Sayfa başlığı",
  video: "Video",
  "main-collection-list": "Koleksiyon kartları",
  "main-collection": "Ürün listesi",
};

function labelForType(type: string) {
  return LABELS[type] ?? type;
}

export function extractMirrorPageSections(html: string, pageKey: VitrinPageKey): MirrorPageSection[] {
  const mainStart = html.indexOf('id="MainContent"');
  const mainEnd = html.indexOf("</main>", mainStart > -1 ? mainStart : 0);
  const main =
    mainStart >= 0 && mainEnd > mainStart ? html.slice(mainStart, mainEnd) : html;

  const re =
    /id="shopify-section-template--[^"]+__([^"]+)"[^>]*class="shopify-section\s+([^"]+)"/g;
  const sections: MirrorPageSection[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(main))) {
    const key = m[1];
    if (seen.has(key)) continue;
    seen.add(key);
    const classAttr = m[2];
    const type =
      classAttr.match(/\bsection-([^\s]+)/)?.[1] ??
      classAttr.split(/\s+/).find((c) => c !== "shopify-section") ??
      classAttr;
    const section: MirrorPageSection = { key, type, label: labelForType(type) };
    if (type === "media-grid") {
      section.mediaGridDefaults = extractMediaGridItemsFromHtml(main, key);
    }
    if (type === "video") {
      section.videoDefaults = extractVideoSectionFromHtml(main, key) ?? undefined;
    }
    if (type === "main-collection-list") {
      section.collectionGridDefaults = extractCollectionGridColumnsFromHtml(main, key);
    }
    if (type === "main-collection") {
      section.productGridDefaults = extractProductGridColumnsFromHtml(main, key);
    }
    if (type === "collections-tab") {
      section.collectionsTabDefaults = extractCollectionsTabDefaults(pageKey, key);
    }
    if (type === "shop-the-look") {
      section.shopTheLookDefaults = extractShopTheLookDefaults(pageKey, key);
    }
    if (type === "featured-blog" || type === "main-blog") {
      section.featuredBlogDefaults = extractFeaturedBlogPostsFromHtml(main, key);
    }
    if (type === "scrolling-collections") {
      section.scrollingCollectionDefaults = extractScrollingCollectionsFromHtml(main, key);
    }
    if (type === "trending-products") {
      section.trendingProductDefaults = extractTrendingProductsFromHtml(main, key);
    }
    if (type === "testimonial") {
      section.testimonialDefaults = extractTestimonialFromHtml(main, key);
    }
    sections.push(section);
  }
  return sections;
}

export function loadMirrorPageSectionsCatalog(pageKey: VitrinPageKey): MirrorPageSection[] {
  const html = readMirrorPageHtml(pageKey);
  if (!html) return [];
  return extractMirrorPageSections(html, pageKey);
}

/** @deprecated */
export function loadMirrorHomeSectionsCatalog() {
  return loadMirrorPageSectionsCatalog("home");
}
