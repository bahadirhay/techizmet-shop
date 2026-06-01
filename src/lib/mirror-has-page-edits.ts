/** İstemci güvenli — overlay düzenleme var mı (fs / server modül yok) */

type SectionEditLike = {
  hidden?: boolean;
  headingHtml?: string;
  mediaGridItems?: unknown[];
  video?: { url?: string };
  collectionGridColumns?: unknown;
  productGridColumns?: unknown;
  collectionsTabs?: unknown[];
  shopTheLook?: { hotspots?: unknown[] };
  featuredBlogPosts?: unknown[];
  scrollingCollections?: unknown[];
  trendingProducts?: unknown[];
  testimonials?: unknown[];
  autoplayMs?: number;
};

export type MirrorPageConfigLike = {
  order?: string[];
  sections?: Record<string, SectionEditLike | undefined>;
  elements?: Record<string, unknown>;
  customBlocks?: unknown[];
};

export function hasMirrorPageEdits(config: MirrorPageConfigLike): boolean {
  if (Object.keys(config.elements ?? {}).length) return true;
  if (config.customBlocks?.length) return true;
  return Object.values(config.sections ?? {}).some((edit) => {
    if (!edit) return false;
    if (edit.hidden) return true;
    if (edit.headingHtml?.trim()) return true;
    if (edit.mediaGridItems?.length) return true;
    if (edit.video?.url?.trim()) return true;
    if (edit.collectionGridColumns) return true;
    if (edit.productGridColumns) return true;
    if (edit.collectionsTabs?.length) return true;
    if (edit.shopTheLook?.hotspots?.length) return true;
    if (edit.featuredBlogPosts?.length) return true;
    if (edit.scrollingCollections?.length) return true;
    if (edit.trendingProducts?.length) return true;
    if (edit.testimonials?.length) return true;
    if (edit.autoplayMs !== undefined) return true;
    return false;
  });
}
