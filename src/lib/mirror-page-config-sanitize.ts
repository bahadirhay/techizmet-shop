import { normalizeMirrorCustomBlocks } from "@/lib/mirror-custom-block-types";
import type { MirrorElementEdit, MirrorElementKind } from "@/lib/mirror-element-edits";
import type { CollectionsTabItemEdit } from "@/lib/mirror-collections-tab";
import type { MediaGridItemEdit } from "@/lib/mirror-media-grid";
import type { ShopTheLookSectionEdit } from "@/lib/mirror-shop-the-look";
import type { FeaturedBlogPostEdit } from "@/lib/mirror-featured-blog";
import { parseCollectionGridColumns } from "@/lib/mirror-collection-list-grid";
import { parseProductGridColumns } from "@/lib/mirror-product-grid";
import type { VideoSectionEdit, VideoSourceType } from "@/lib/mirror-video-section";
import type { MirrorPageConfig, MirrorPageSectionEdit } from "@/lib/mirror-home-overlay";
import { loadMirrorPageSectionsCatalog } from "@/lib/mirror-page-sections";
import type { VitrinPageKey } from "@/lib/mirror-vitrin-pages";

export function sanitizeMirrorPageConfig(
  pageKey: VitrinPageKey,
  body: unknown,
): MirrorPageConfig | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as { order?: unknown; sections?: unknown; elements?: unknown; customBlocks?: unknown };
  if (!Array.isArray(raw.order)) return null;

  const catalogKeys = new Set(loadMirrorPageSectionsCatalog(pageKey).map((s) => s.key));
  const order = raw.order.filter((k): k is string => typeof k === "string" && catalogKeys.has(k));

  const sections: Record<string, MirrorPageSectionEdit> = {};
  if (raw.sections && typeof raw.sections === "object") {
    for (const [key, val] of Object.entries(raw.sections as Record<string, unknown>)) {
      if (!catalogKeys.has(key) || !val || typeof val !== "object") continue;
      const e = val as MirrorPageSectionEdit;
      const edit: MirrorPageSectionEdit = {};
      if (e.hidden === true) edit.hidden = true;
      if (typeof e.headingHtml === "string" && e.headingHtml.trim()) {
        edit.headingHtml = e.headingHtml.trim().slice(0, 2000);
      }
      if (Array.isArray(e.mediaGridItems)) {
        edit.mediaGridItems = e.mediaGridItems
          .filter((it): it is MediaGridItemEdit => Boolean(it && typeof it === "object"))
          .map((it) => ({
            itemId: String(it.itemId ?? "").slice(0, 80),
            imageUrl: typeof it.imageUrl === "string" ? it.imageUrl.trim().slice(0, 500) : undefined,
            headingHtml:
              typeof it.headingHtml === "string" ? it.headingHtml.trim().slice(0, 2000) : undefined,
            descriptionHtml:
              typeof it.descriptionHtml === "string"
                ? it.descriptionHtml.trim().slice(0, 2000)
                : undefined,
            linkHref:
              typeof it.linkHref === "string" ? it.linkHref.trim().slice(0, 300) : undefined,
            buttonText:
              typeof it.buttonText === "string" ? it.buttonText.trim().slice(0, 120) : undefined,
          }))
          .filter((it) => it.itemId.startsWith("media-grid-grid_"));
      }
      if (e.video && typeof e.video === "object") {
        const v = e.video as VideoSectionEdit;
        const sources = new Set<VideoSourceType>(["local", "youtube", "vimeo", "instagram"]);
        const sourceType = sources.has(v.sourceType as VideoSourceType)
          ? v.sourceType
          : "local";
        const url = typeof v.url === "string" ? v.url.trim().slice(0, 500) : "";
        if (url) {
          edit.video = {
            sourceType,
            url,
            posterUrl:
              typeof v.posterUrl === "string" && v.posterUrl.trim()
                ? v.posterUrl.trim().slice(0, 500)
                : undefined,
            autoplay: v.autoplay !== false,
            muted: v.muted !== false,
            loop: v.loop !== false,
          };
        }
      }
      if (typeof e.autoplayMs === "number" && Number.isFinite(e.autoplayMs)) {
        edit.autoplayMs = Math.max(0, Math.min(60000, Math.round(e.autoplayMs)));
      }
      const gridCols = parseCollectionGridColumns(
        (e as { collectionGridColumns?: unknown }).collectionGridColumns,
      );
      if (gridCols) edit.collectionGridColumns = gridCols;
      const productCols = parseProductGridColumns(
        (e as { productGridColumns?: unknown }).productGridColumns,
      );
      if (productCols) edit.productGridColumns = productCols;
      if (Array.isArray((e as { collectionsTabs?: unknown }).collectionsTabs)) {
        edit.collectionsTabs = sanitizeCollectionsTabs(
          (e as { collectionsTabs: CollectionsTabItemEdit[] }).collectionsTabs,
        );
      }
      if ((e as { shopTheLook?: unknown }).shopTheLook) {
        const stl = sanitizeShopTheLook((e as { shopTheLook: ShopTheLookSectionEdit }).shopTheLook);
        if (stl) edit.shopTheLook = stl;
      }
      if (Array.isArray((e as { featuredBlogPosts?: unknown }).featuredBlogPosts)) {
        edit.featuredBlogPosts = sanitizeFeaturedBlogPosts(
          (e as { featuredBlogPosts: FeaturedBlogPostEdit[] }).featuredBlogPosts,
        );
      }
      if (Object.keys(edit).length) sections[key] = edit;
    }
  }

  const elements: Record<string, MirrorElementEdit> = {};
  if (raw.elements && typeof raw.elements === "object") {
    const kinds = new Set<MirrorElementKind>(["html", "text", "image", "link"]);
    for (const [id, val] of Object.entries(raw.elements as Record<string, unknown>)) {
      if (!val || typeof val !== "object") continue;
      const e = val as MirrorElementEdit;
      const kind = kinds.has(e.kind as MirrorElementKind) ? e.kind : "text";
      const edit: MirrorElementEdit = {
        id: String(id).slice(0, 120),
        kind: kind as MirrorElementKind,
      };
      if (typeof e.html === "string" && e.html.trim()) edit.html = e.html.trim().slice(0, 8000);
      if (typeof e.text === "string" && e.text.trim()) edit.text = e.text.trim().slice(0, 4000);
      if (typeof e.imageUrl === "string" && e.imageUrl.trim())
        edit.imageUrl = e.imageUrl.trim().slice(0, 500);
      if (typeof e.href === "string" && e.href.trim()) edit.href = e.href.trim().slice(0, 500);
      if (edit.html || edit.text || edit.imageUrl || edit.href) elements[edit.id] = edit;
    }
  }

  for (const k of catalogKeys) {
    if (!order.includes(k)) order.push(k);
  }

  const customBlocks = normalizeMirrorCustomBlocks(raw.customBlocks);

  return {
    order,
    sections,
    elements: Object.keys(elements).length ? elements : undefined,
    customBlocks: customBlocks.length ? customBlocks : undefined,
  };
}

function sanitizeCollectionsTabs(raw: CollectionsTabItemEdit[]): CollectionsTabItemEdit[] {
  return raw
    .filter((t) => t && typeof t.tabId === "string")
    .map((t) => {
      const labelTr =
        (typeof t.labelTr === "string" ? t.labelTr : typeof t.label === "string" ? t.label : "")
          .trim()
          .slice(0, 80);
      const labelEn = (typeof t.labelEn === "string" ? t.labelEn : labelTr).trim().slice(0, 80);
      return {
        tabId: t.tabId.slice(0, 80),
        label: labelTr,
        labelTr,
        labelEn,
        products: (t.products ?? [])
          .filter((p) => p && typeof p.href === "string")
          .map((p, i) => {
            const titleTr = (
              typeof p.titleTr === "string"
                ? p.titleTr
                : typeof p.title === "string"
                  ? p.title
                  : ""
            )
              .trim()
              .slice(0, 200);
            const titleEn = (
              typeof p.titleEn === "string" ? p.titleEn : titleTr
            )
              .trim()
              .slice(0, 200);
            return {
              key: String(p.key ?? `p-${i}`).slice(0, 80),
              href: p.href.trim().slice(0, 300),
              title: titleTr,
              titleTr,
              titleEn,
              imageUrl:
                typeof p.imageUrl === "string" && p.imageUrl.trim()
                  ? p.imageUrl.trim().slice(0, 500)
                  : undefined,
            };
          }),
      };
    });
}

function sanitizeFeaturedBlogPosts(raw: FeaturedBlogPostEdit[]): FeaturedBlogPostEdit[] {
  return raw
    .filter((p) => p && typeof p.postId === "string")
    .map((p) => ({
      postId: p.postId.trim().slice(0, 120),
      imageUrl:
        typeof p.imageUrl === "string" && p.imageUrl.trim()
          ? p.imageUrl.trim().slice(0, 500)
          : undefined,
      href: typeof p.href === "string" && p.href.trim() ? p.href.trim().slice(0, 300) : undefined,
      titleTr:
        typeof p.titleTr === "string" ? p.titleTr.trim().slice(0, 300) : undefined,
      titleEn:
        typeof p.titleEn === "string" ? p.titleEn.trim().slice(0, 300) : undefined,
      descTr: typeof p.descTr === "string" ? p.descTr.trim().slice(0, 2000) : undefined,
      descEn: typeof p.descEn === "string" ? p.descEn.trim().slice(0, 2000) : undefined,
      dateLabel:
        typeof p.dateLabel === "string" ? p.dateLabel.trim().slice(0, 80) : undefined,
      author: typeof p.author === "string" ? p.author.trim().slice(0, 80) : undefined,
    }));
}

function sanitizeShopTheLook(raw: ShopTheLookSectionEdit): ShopTheLookSectionEdit | null {
  if (!raw || typeof raw !== "object") return null;
  const mainImageUrl =
    typeof raw.mainImageUrl === "string" && raw.mainImageUrl.trim()
      ? raw.mainImageUrl.trim().slice(0, 500)
      : undefined;
  const hotspots = (raw.hotspots ?? [])
    .filter((h) => h && typeof h.hotspotId === "string")
    .map((h) => ({
      hotspotId: h.hotspotId.slice(0, 80),
      drawerHeading:
        typeof h.drawerHeading === "string" ? h.drawerHeading.trim().slice(0, 120) : undefined,
      drawerHeadingTr:
        typeof h.drawerHeadingTr === "string"
          ? h.drawerHeadingTr.trim().slice(0, 120)
          : typeof h.drawerHeading === "string"
            ? h.drawerHeading.trim().slice(0, 120)
            : undefined,
      drawerHeadingEn:
        typeof h.drawerHeadingEn === "string" ? h.drawerHeadingEn.trim().slice(0, 120) : undefined,
      drawerDesc:
        typeof h.drawerDesc === "string" ? h.drawerDesc.trim().slice(0, 500) : undefined,
      drawerDescTr:
        typeof h.drawerDescTr === "string"
          ? h.drawerDescTr.trim().slice(0, 500)
          : typeof h.drawerDesc === "string"
            ? h.drawerDesc.trim().slice(0, 500)
            : undefined,
      drawerDescEn:
        typeof h.drawerDescEn === "string" ? h.drawerDescEn.trim().slice(0, 500) : undefined,
      products: (h.products ?? [])
        .filter((p) => p && typeof p.href === "string")
        .map((p, i) => {
          const titleTr = (
            typeof p.titleTr === "string"
              ? p.titleTr
              : typeof p.title === "string"
                ? p.title
                : ""
          )
            .trim()
            .slice(0, 200);
          const titleEn = (typeof p.titleEn === "string" ? p.titleEn : titleTr).trim().slice(0, 200);
          return {
            key: String(p.key ?? `p-${i}`).slice(0, 80),
            href: p.href.trim().slice(0, 300),
            title: titleTr,
            titleTr,
            titleEn,
            imageUrl:
              typeof p.imageUrl === "string" && p.imageUrl.trim()
                ? p.imageUrl.trim().slice(0, 500)
                : undefined,
            hoverImageUrl:
              typeof p.hoverImageUrl === "string" && p.hoverImageUrl.trim()
                ? p.hoverImageUrl.trim().slice(0, 500)
                : undefined,
          };
        }),
    }));
  return { mainImageUrl, hotspots };
}
