/** İstemci güvenli — overlay düzenleme var mı (fs / server modül yok) */

type SectionEditLike = {
  hidden?: boolean;
  headingHtml?: string;
  mediaGridItems?: unknown[];
  video?: { url?: string };
  collectionGridColumns?: unknown;
  productGridColumns?: unknown;
  collectionsTabs?: Array<{
    hidden?: boolean;
    showPricing?: boolean;
    visibleProductCount?: number;
    products?: Array<{ hidden?: boolean }>;
  }>;
  shopTheLook?: { hotspots?: unknown[] };
  featuredBlogPosts?: unknown[];
  scrollingCollections?: unknown[];
  trendingProducts?: unknown[];
  testimonials?: unknown[];
  testimonialVisibleCount?: number;
  autoplayMs?: number;
};

export type MirrorPageConfigLike = {
  order?: string[];
  sections?: Record<string, SectionEditLike | undefined>;
  elements?: Record<string, unknown>;
  customBlocks?: unknown[];
  contactFormCentered?: boolean;
};

/** Sıra / gizleme dahil — overlay ve canlı API gerekiyor mu */
export function shouldApplyMirrorPageOverlay(config: MirrorPageConfigLike): boolean {
  if ((config.order?.length ?? 0) > 0) return true;
  return hasMirrorPageEdits(config);
}

export function hasMirrorPageEdits(config: MirrorPageConfigLike): boolean {
  if (Object.keys(config.elements ?? {}).length) return true;
  if (config.customBlocks?.length) return true;
  if (config.contactFormCentered) return true;
  return Object.values(config.sections ?? {}).some((edit) => {
    if (!edit) return false;
    if (edit.hidden) return true;
    if (edit.headingHtml?.trim()) return true;
    if ((edit as { marqueeHtml?: string }).marqueeHtml?.trim()) return true;
    if (edit.mediaGridItems?.length) return true;
    if (edit.video?.url?.trim()) return true;
    if (edit.collectionGridColumns) return true;
    if (edit.productGridColumns) return true;
    if (edit.collectionsTabs?.length) return true;
    if (
      edit.collectionsTabs?.some(
        (tab) =>
          tab?.hidden ||
          tab?.showPricing === false ||
          tab?.visibleProductCount != null ||
          tab?.products?.some((p) => p?.hidden),
      )
    ) {
      return true;
    }
    if (edit.shopTheLook?.hotspots?.length) return true;
    if (edit.featuredBlogPosts?.length) return true;
    if (edit.scrollingCollections?.length) return true;
    if (edit.trendingProducts?.length) return true;
    if (edit.testimonials?.length) return true;
    if (edit.testimonialVisibleCount != null) return true;
    if (edit.autoplayMs !== undefined) return true;
    return false;
  });
}
