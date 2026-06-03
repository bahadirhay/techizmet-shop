/** İstemci + sunucu — fs yok (iframe overlay) */

export type MirrorPageSection = {
  key: string;
  type: string;
  label: string;
  /** media-grid bölümleri — mirror HTML’den okunan kartlar */
  mediaGridDefaults?: MediaGridItemEdit[];
  /** section-video — mirror HTML’den okunan kaynak */
  videoDefaults?: VideoSectionData;
  /** main-collection-list — varsayılan sütun (3–5) */
  collectionGridDefaults?: CollectionGridColumns;
  /** main-collection — varsayılan ürün sütunu (3–8) */
  productGridDefaults?: ProductGridColumns;
  /** collections-tab — sekme etiketleri + ürünler */
  collectionsTabDefaults?: import("@/lib/mirror-collections-tab").CollectionsTabItemEdit[];
  /** shop-the-look — hotspot ürünleri */
  shopTheLookDefaults?: import("@/lib/mirror-shop-the-look").ShopTheLookSectionEdit;
  /** featured-blog — blog kartları */
  featuredBlogDefaults?: import("@/lib/mirror-featured-blog").FeaturedBlogPostData[];
  /** scrolling-collections — kaydırılan koleksiyon kartları */
  scrollingCollectionDefaults?: import("@/lib/mirror-scrolling-collections-section").ScrollingCollectionItemEdit[];
  /** trending-products — trend sütunları */
  trendingProductDefaults?: import("@/lib/mirror-trending-products-section").TrendingProductItemEdit[];
  /** testimonial — müşteri yorumları */
  testimonialDefaults?: import("@/lib/mirror-testimonial-section").TestimonialItemEdit[];
};

import {
  applyMediaGridItemsToSection,
  type MediaGridItemData,
  type MediaGridItemEdit,
} from "@/lib/mirror-media-grid";
import {
  applyCollectionGridColumns,
  type CollectionGridColumns,
} from "@/lib/mirror-collection-list-grid";
import {
  applyProductGridColumns,
  type ProductGridColumns,
} from "@/lib/mirror-product-grid";
import {
  applyVideoSectionToElement,
  type VideoSectionData,
  type VideoSectionEdit,
} from "@/lib/mirror-video-section";

export type { MediaGridItemEdit, MediaGridItemData } from "@/lib/mirror-media-grid";
export type { VideoSectionData, VideoSectionEdit } from "@/lib/mirror-video-section";
export type { CollectionGridColumns } from "@/lib/mirror-collection-list-grid";
export type { ProductGridColumns } from "@/lib/mirror-product-grid";

export type MirrorPageSectionEdit = {
  hidden?: boolean;
  headingHtml?: string;
  /** section-media-grid — her kart (görsel, başlık, metin, link) */
  mediaGridItems?: MediaGridItemEdit[];
  /** section-video — yerel dosya veya YouTube / Instagram / Vimeo */
  video?: VideoSectionEdit;
  /** Swiper / duyuru şeridi — ms (0 = kapalı) */
  autoplayMs?: number;
  /** main-collection-list — 3 / 4 / 5 sütun */
  collectionGridColumns?: CollectionGridColumns;
  /** main-collection (Çok Satanlar) — 3–8 sütun */
  productGridColumns?: ProductGridColumns;
  /** collections-tab — İPEKİ / PETAL / HYDRA */
  collectionsTabs?: import("@/lib/mirror-collections-tab").CollectionsTabItemEdit[];
  /** shop-the-look */
  shopTheLook?: import("@/lib/mirror-shop-the-look").ShopTheLookSectionEdit;
  /** featured-blog */
  featuredBlogPosts?: import("@/lib/mirror-featured-blog").FeaturedBlogPostEdit[];
  /** scrolling-collections */
  scrollingCollections?: import("@/lib/mirror-scrolling-collections-section").ScrollingCollectionItemEdit[];
  /** trending-products */
  trendingProducts?: import("@/lib/mirror-trending-products-section").TrendingProductItemEdit[];
  /** testimonial */
  testimonials?: import("@/lib/mirror-testimonial-section").TestimonialItemEdit[];
};

import {
  applyMirrorElementEdits,
  type MirrorElementEdit,
} from "@/lib/mirror-element-edits";

export type { MirrorElementEdit, MirrorElementKind, MirrorElementPick } from "@/lib/mirror-element-edits";

import type { ShopLocale } from "@/lib/i18n/locale";
import { applyCollectionsTabToSection } from "@/lib/mirror-collections-tab";
import { applyCustomBlocksInject } from "@/lib/mirror-custom-blocks-html";
import type { MirrorCustomBlockEntry } from "@/lib/mirror-custom-block-types";
import { applyShopTheLookToSection } from "@/lib/mirror-shop-the-look";
import { applyFeaturedBlogPostsToSection } from "@/lib/mirror-featured-blog";
import { applyScrollingCollectionsToSection } from "@/lib/mirror-scrolling-collections-section";
import { applyTrendingProductsToSection } from "@/lib/mirror-trending-products-section";
import { applyTestimonialToSection } from "@/lib/mirror-testimonial-section";

export type MirrorPageConfig = {
  order: string[];
  sections: Record<string, MirrorPageSectionEdit>;
  /** Tıkla-düzenle — id: data-kn-edit */
  elements?: Record<string, MirrorElementEdit>;
  /** Vitrin widget'ları — bölüm arasına yerleştirilebilir */
  customBlocks?: MirrorCustomBlockEntry[];
};

/** @deprecated */
export type MirrorHomeSection = MirrorPageSection;
/** @deprecated */
export type MirrorHomeSectionEdit = MirrorPageSectionEdit;
/** @deprecated */
export type MirrorHomeConfig = MirrorPageConfig;

export type MirrorPageOverlayMeta = {
  pageTitle?: string | null;
};

function sectionEl(doc: Document, key: string) {
  return doc.querySelector(`section[id$="__${key}"]`);
}

import { hasMirrorPageEdits } from "@/lib/mirror-has-page-edits";

export { hasMirrorPageEdits } from "@/lib/mirror-has-page-edits";

export function applyMirrorPageOverlay(
  doc: Document,
  config: MirrorPageConfig,
  meta?: MirrorPageOverlayMeta,
  locale: ShopLocale = "tr",
) {
  if (meta?.pageTitle?.trim()) {
    const banner = doc.querySelector(
      "#MainContent .page-banner h1, #MainContent .section-page-banner h1, #MainContent h1.section--heading",
    );
    if (banner) banner.textContent = meta.pageTitle.trim();
  }

  if (!hasMirrorPageEdits(config as Parameters<typeof hasMirrorPageEdits>[0]) && !meta?.pageTitle?.trim())
    return;

  applyMirrorSectionLayout(doc, config, locale);
  applyMirrorElementEdits(doc, config.elements);
  if (config.customBlocks?.length) applyCustomBlocksInject(doc, config.customBlocks);
}

/** @deprecated */
export function applyMirrorHomeOverlay(
  doc: Document,
  config: MirrorHomeConfig,
  locale: ShopLocale = "tr",
) {
  applyMirrorPageOverlay(doc, config, undefined, locale);
}

function applyMirrorSectionLayout(doc: Document, config: MirrorPageConfig, locale: ShopLocale) {
  const main = doc.getElementById("MainContent");
  if (!main) return;

  main.querySelectorAll("section.kn-mirror-section").forEach((el) => {
    (el as HTMLElement).style.display = "";
  });

  const visibleInOrder = config.order.filter((key) => !config.sections[key]?.hidden).length;

  for (const key of config.order) {
    const edit = config.sections[key];
    const el = sectionEl(doc, key);
    if (!el) continue;
    if (edit?.hidden && visibleInOrder > 0) {
      (el as HTMLElement).style.display = "none";
      continue;
    }
    (el as HTMLElement).style.display = "";
    if (edit?.headingHtml?.trim()) {
      const h = el.querySelector(".section--heading");
      if (h) h.innerHTML = edit.headingHtml.trim();
    }
    if (edit?.mediaGridItems?.length) {
      applyMediaGridItemsToSection(el, edit.mediaGridItems);
    }
    if (edit?.video?.url?.trim()) {
      applyVideoSectionToElement(el, edit.video);
    }
    if (edit?.collectionGridColumns) {
      applyCollectionGridColumns(el, edit.collectionGridColumns);
    }
    if (edit?.productGridColumns) {
      applyProductGridColumns(el, edit.productGridColumns);
    }
    if (edit?.collectionsTabs?.length) {
      applyCollectionsTabToSection(el, edit.collectionsTabs, locale);
    }
    if (edit?.shopTheLook?.hotspots?.length) {
      applyShopTheLookToSection(el, edit.shopTheLook, locale);
    }
    if (edit?.featuredBlogPosts?.length) {
      applyFeaturedBlogPostsToSection(el, edit.featuredBlogPosts, locale);
    }
    if (edit?.scrollingCollections?.length) {
      applyScrollingCollectionsToSection(el, edit.scrollingCollections, locale);
    }
    if (edit?.trendingProducts?.length) {
      applyTrendingProductsToSection(el, edit.trendingProducts, locale);
    }
    if (edit?.testimonials?.length) {
      applyTestimonialToSection(el, edit.testimonials, locale);
    }
    if (edit?.autoplayMs !== undefined) {
      const swiperHost = el.querySelector("[data-swiper]");
      if (swiperHost) {
        try {
          const raw = swiperHost.getAttribute("data-swiper") ?? "{}";
          const cfg = JSON.parse(raw.replace(/'/g, '"')) as {
            autoplay?: { delay?: number; disableOnInteraction?: boolean } | false;
          };
          cfg.autoplay =
            edit.autoplayMs > 0
              ? { delay: edit.autoplayMs, disableOnInteraction: false }
              : false;
          swiperHost.setAttribute("data-swiper", JSON.stringify(cfg).replace(/"/g, "'"));
        } catch {
          /* ignore */
        }
      }
    }
    /* Bölüm sırası: DOM taşıma (appendChild) Swiper / custom element init bozar — yerinde düzenle */
  }
}

export { applyMirrorSectionLayout };
