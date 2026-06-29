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
  /** section-marquee — kayan indirim metni (yedek; asıl kaynak elements) */
  marqueeHtml?: string;
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
  /** testimonial — vitrinde görünen kart sayısı (1–N, boş = hepsi) */
  testimonialVisibleCount?: number;
};

import {
  applyMarqueeTextToSection,
  applyMirrorElementEdits,
  enhanceMarqueeSection,
  resolveMarqueeElementEdit,
  resolveMarqueeHtmlFromEdit,
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
import { applyTestimonialToSection, applyTestimonialVisibility } from "@/lib/mirror-testimonial-section";

export type MirrorPageConfig = {
  order: string[];
  sections: Record<string, MirrorPageSectionEdit>;
  /** Tıkla-düzenle — id: data-kn-edit */
  elements?: Record<string, MirrorElementEdit>;
  /** Vitrin widget'ları — bölüm arasına yerleştirilebilir */
  customBlocks?: MirrorCustomBlockEntry[];
  /** İletişim sayfası formu ortala — harita kutusu gizlenir, form tam genişlik */
  contactFormCentered?: boolean;
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

export function mirrorSectionKeyFromElement(el: Element): string | null {
  const id = el.id?.trim();
  if (!id) return null;
  return id.match(/__([a-zA-Z0-9_]+)$/)?.[1] ?? null;
}

function mirrorSectionChildren(main: Element): Element[] {
  return [...main.children].filter(
    (el): el is Element => el.tagName === "SECTION" && el.classList.contains("kn-mirror-section"),
  );
}

/** Widget kökleri sıralamayı bozar — yeniden dizmeden önce kaldırılır */
function stripMirrorCustomBlockRoots(main: Element) {
  main.querySelectorAll(".kn-custom-block-root").forEach((el) => el.remove());
}

/**
 * MainContent içinde bölümleri vitrin sırasına göre yeniden diz.
 * DocumentFragment ile tek seferde yazar; tema scriptleri sonrası flex order yedeklenir.
 */
export function reorderMirrorSectionsInMain(main: Element, order: string[]) {
  if (!order.length) return;

  stripMirrorCustomBlockRoots(main);

  const sections = mirrorSectionChildren(main);
  const byKey = new Map<string, Element>();
  for (const el of sections) {
    const key = mirrorSectionKeyFromElement(el);
    if (key) byKey.set(key, el);
  }

  const placed = new Set<Element>();

  for (const key of order) {
    const el = byKey.get(key);
    if (!el) continue;
    main.appendChild(el);
    placed.add(el);
  }
  for (const el of sections) {
    if (!placed.has(el)) main.appendChild(el);
  }
}

const MIRROR_SECTION_ORDER_STYLE_ID = "kn-mirror-section-order";

function escapeMirrorSectionKeyCss(key: string) {
  return key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** CSS flex order — yalnızca stylesheet; inline style CLS yapar */
export function applyMirrorSectionOrderStyles(main: Element, order: string[]) {
  if (!order.length) return;
  (main as HTMLElement).setAttribute("data-kn-section-order", order.join(","));
}

/** Kalıcı stylesheet — tema inline style sıfırlasa bile sıra ve görünürlük korunur */
export function injectMirrorSectionOrderStylesheet(
  doc: Document,
  order: string[],
  hiddenKeys?: Set<string>,
) {
  if (!order.length) return;

  const rank = new Map(order.map((key, index) => [key, index]));
  const rules = [
    "#MainContent { display: flex !important; flex-direction: column !important; }",
  ];
  let fallback = order.length;

  for (const el of doc.querySelectorAll("#MainContent > section.kn-mirror-section")) {
    const key = mirrorSectionKeyFromElement(el);
    const idx = key != null ? rank.get(key) : undefined;
    const orderVal = idx ?? fallback++;
    if (key) {
      rules.push(
        `#MainContent > section[id$="__${escapeMirrorSectionKeyCss(key)}"] { order: ${orderVal} !important; }`,
      );
    }
  }

  // Gizli section'lar inline style yerine CSS kuralı ile gizlenir —
  // tema JS'i inline style'ı temizlese bile gizli kalır
  if (hiddenKeys?.size) {
    for (const key of hiddenKeys) {
      rules.push(
        `#MainContent > section[id$="__${escapeMirrorSectionKeyCss(key)}"] { display: none !important; }`,
      );
    }
  }

  let style = doc.getElementById(MIRROR_SECTION_ORDER_STYLE_ID);
  if (!style) {
    style = doc.createElement("style");
    style.id = MIRROR_SECTION_ORDER_STYLE_ID;
    doc.head.appendChild(style);
  }
  style.textContent = rules.join("\n");
}

/** Vitrin önizleme / canlı — DOM + inline + stylesheet ile sıra uygula */
export function applyMirrorSectionOrderToDocument(doc: Document, order: string[]) {
  const main = doc.getElementById("MainContent");
  if (!main || !order.length) return;
  injectMirrorSectionOrderStylesheet(doc, order);
  applyMirrorSectionOrderStyles(main, order);
  reorderMirrorSectionsInMain(main, order);
}

/** Admin önizleme URL'sinden gelen sıra — kayıtlı config ile birleştir */
export function mergeLayoutOrderOverride(
  config: MirrorPageConfig,
  layoutOrder: string[] | undefined,
): MirrorPageConfig {
  if (!layoutOrder?.length) return config;
  const valid = new Set(config.order);
  const next: string[] = [];
  for (const key of layoutOrder) {
    if (valid.has(key) && !next.includes(key)) next.push(key);
  }
  for (const key of config.order) {
    if (!next.includes(key)) next.push(key);
  }
  return { ...config, order: next };
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

  const hasElements = Boolean(config.elements && Object.keys(config.elements).length);
  const hasLayout =
    (config.order?.length ?? 0) > 0 ||
    hasMirrorPageEdits(config as Parameters<typeof hasMirrorPageEdits>[0]) ||
    Boolean(meta?.pageTitle?.trim());

  if (hasElements) {
    applyMirrorElementEdits(doc, config.elements, locale);
  }
  if (hasLayout) {
    applyMirrorSectionLayout(doc, config, locale);
  }
  if (config.customBlocks?.length) {
    applyCustomBlocksInject(doc, config.customBlocks);
    if (config.order.length) {
      injectMirrorSectionOrderStylesheet(doc, config.order);
    }
  }

  if (config.contactFormCentered) {
    const styleId = "kn-contact-form-centered";
    if (!doc.getElementById(styleId)) {
      const s = doc.createElement("style");
      s.id = styleId;
      s.textContent =
        `.contact-form--wrapper,.contact-form--wrapper.style-both{display:block!important;grid-template-columns:none!important;flex-direction:column!important}` +
        `.contact-form--map-box{display:none!important}` +
        `.contact-form--content{max-width:720px!important;margin:0 auto!important;width:100%!important;float:none!important;flex:none!important}` +
        `.contact-form--content-inner{padding:0!important;text-align:center}` +
        `.contact-form--content-inner h2,.contact-form--content-inner .contact-form--title{text-align:center!important}` +
        `.contact-form--box{margin:0 auto!important}` +
        `.contact-form--fields{display:grid!important;grid-template-columns:1fr 1fr!important;gap:16px!important}` +
        `.contact-form--fields .field{margin:0!important}` +
        `[id*="contact_form"] .normal-button,[id*="contact_form"] .button{margin:0 auto!important;display:block!important;width:fit-content!important}`;
      doc.head.appendChild(s);
    }
  } else {
    doc.getElementById("kn-contact-form-centered")?.remove();
  }

  doc.querySelectorAll("section.section-marquee").forEach((section) => {
    enhanceMarqueeSection(section);
  });
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

  const hiddenKeys = new Set(
    config.order.filter((key) => !!config.sections[key]?.hidden),
  );

  if (config.order.length) {
    // hiddenKeys CSS stylesheet'e eklenir — tema JS inline style'ı temizlese bile gizli kalır
    injectMirrorSectionOrderStylesheet(doc, config.order, hiddenKeys);
    applyMirrorSectionOrderStyles(main, config.order);
    reorderMirrorSectionsInMain(main, config.order);
  }

  main.querySelectorAll("section.kn-mirror-section").forEach((el) => {
    (el as HTMLElement).style.removeProperty("display");
  });

  const visibleInOrder = config.order.length - hiddenKeys.size;

  for (const key of config.order) {
    const edit = config.sections[key];
    const el = sectionEl(doc, key);
    if (!el) continue;
    if (edit?.hidden && visibleInOrder > 0) {
      (el as HTMLElement).style.display = "none";
      continue;
    }
    (el as HTMLElement).style.removeProperty("display");
    // EN locale: headingHtmlEn varsa kullan; yoksa TR override'ı atla
    const effectiveHeading =
      locale === "en"
        ? (edit as { headingHtmlEn?: string })?.headingHtmlEn?.trim() ?? null
        : edit?.headingHtml?.trim() ?? null;
    if (effectiveHeading) {
      const h = el.querySelector(".section--heading");
      if (h) h.innerHTML = effectiveHeading;
    }
    const marqueeHtml =
      resolveMarqueeHtmlFromEdit(resolveMarqueeElementEdit(key, config.elements)) ||
      edit?.marqueeHtml?.trim();
    if (marqueeHtml) {
      applyMarqueeTextToSection(el, marqueeHtml);
    }
    if (edit?.mediaGridItems?.length) {
      applyMediaGridItemsToSection(el, edit.mediaGridItems, locale);
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
      applyTestimonialToSection(el, edit.testimonials, locale, edit.testimonialVisibleCount);
    } else if (edit?.testimonialVisibleCount != null) {
      applyTestimonialVisibility(el, edit.testimonialVisibleCount);
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
  }
}

export { applyMirrorSectionLayout };
