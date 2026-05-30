"use client";

import {
  MediaGridSectionFields,
  mergeMediaGridEdits,
} from "@/components/admin/MediaGridSectionFields";
import {
  MirrorCollectionGridFields,
  mergeCollectionGridColumns,
  mergeProductGridColumns,
} from "@/components/admin/MirrorCollectionGridFields";
import {
  CollectionsTabSectionFields,
} from "@/components/admin/CollectionsTabSectionFields";
import { ShopTheLookSectionFields } from "@/components/admin/ShopTheLookSectionFields";
import {
  MirrorVideoSectionFields,
  mergeVideoSectionEdit,
} from "@/components/admin/MirrorVideoSectionFields";
import { mergeCollectionsTabEdits } from "@/lib/mirror-collections-tab";
import { mergeShopTheLookEdits } from "@/lib/mirror-shop-the-look";
import { mergeFeaturedBlogEdits } from "@/lib/mirror-featured-blog";
import { BlogPostsDbPanel } from "@/components/admin/BlogPostsDbPanel";
import { FeaturedBlogSectionFields } from "@/components/admin/FeaturedBlogSectionFields";
import type { BlogPostAdminEditorRow } from "@/lib/blog/blog-posts-server";
import {
  ScrollingCollectionsSectionFields,
  TestimonialSectionFields,
  TrendingProductsSectionFields,
} from "@/components/admin/MirrorHomeExtraSectionFields";
import { mergeScrollingCollectionEdits } from "@/lib/mirror-scrolling-collections-section";
import { mergeTrendingProductEdits } from "@/lib/mirror-trending-products-section";
import { mergeTestimonialEdits } from "@/lib/mirror-testimonial-section";
import { MirrorImageField } from "@/components/admin/MirrorImageField";
import { PlainHtmlTextarea } from "@/components/admin/PlainHtmlTextarea";
import type { AdminProductOption } from "@/lib/admin-product-options";
import type { EditableFieldDef } from "@/lib/mirror-editable-catalog";
import type { MirrorElementEdit } from "@/lib/mirror-element-edits";
import type { CollectionGridColumns } from "@/lib/mirror-collection-list-grid";
import type { ProductGridColumns } from "@/lib/mirror-product-grid";
import type { MirrorPageSection, MirrorPageSectionEdit } from "@/lib/mirror-home-overlay";

function fieldValue(field: EditableFieldDef, elements: Record<string, MirrorElementEdit> | undefined): string {
  const edit = elements?.[field.id];
  if (field.kind === "image") return edit?.imageUrl ?? field.defaultValue;
  if (field.kind === "link") return edit?.href ?? field.defaultValue;
  if (field.kind === "html") return edit?.html ?? field.defaultValue;
  return edit?.text ?? field.defaultValue;
}

type ProductSlotGroup = {
  slotId: string;
  label: string;
  titleId?: string;
  priceId?: string;
  linkIds: string[];
  imageIds: string[];
};

function productSlugFromHref(href: string) {
  return href.match(/\/products\/([^/?#]+)/i)?.[1] ?? "";
}

function getProductSlotGroups(section: MirrorPageSection, fields: EditableFieldDef[]): ProductSlotGroup[] {
  if (
    !["best-selling-products", "collections-grid", "featured-collection", "media-gallery"].includes(
      section.type,
    )
  ) {
    return [];
  }

  const titleIds = fields
    .filter((field) => field.id.includes("--product-title--"))
    .map((field) => field.id);
  const priceIds = fields
    .filter((field) => field.id.includes("--product-actual-price--"))
    .map((field) => field.id);
  const imageIds = fields
    .filter((field) => field.id.includes("--img-product-card-image--"))
    .map((field) => field.id);
  const linkImageIds = fields
    .filter((field) => field.id.includes("--a-product-image--"))
    .map((field) => field.id);
  const linkTitleIds = fields
    .filter((field) => field.id.includes("--a-product-title--"))
    .map((field) => field.id);
  if (!titleIds.length) return [];
  const imagesPerSlot = Math.max(1, Math.round(imageIds.length / Math.max(titleIds.length, 1)));

  return titleIds.map((titleId, index) => {
    return {
      slotId: `${section.key}--product-slot--${index}`,
      label: `Ürün slotu ${index + 1}`,
      titleId,
      priceId: priceIds[index],
      linkIds: [linkImageIds[index], linkTitleIds[index]].filter(Boolean),
      imageIds: imageIds.slice(index * imagesPerSlot, index * imagesPerSlot + imagesPerSlot),
    };
  });
}

function GenericProductSlotFields({
  section,
  fields,
  productOptions,
  elements,
  onPatchElement,
}: {
  section: MirrorPageSection;
  fields: EditableFieldDef[];
  productOptions: AdminProductOption[];
  elements: Record<string, MirrorElementEdit> | undefined;
  onPatchElement: (edit: MirrorElementEdit) => void;
}) {
  const groups = getProductSlotGroups(section, fields);
  if (!groups.length || !productOptions.length) return null;

  return (
    <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-950/50 p-3">
      <p className="text-xs text-zinc-400">
        Bu bölümde ürün kartlarını tek tek görsel yükleyerek değil, ürün seçerek yönetin.
      </p>
      {groups.map((group) => {
        const hrefField =
          group.linkIds
            .map((id) => fields.find((field) => field.id === id))
            .find(Boolean) ?? null;
        const currentSlug = hrefField ? productSlugFromHref(fieldValue(hrefField, elements)) : "";
        return (
          <label key={group.slotId} className="block text-xs text-zinc-400">
            {group.label}
            <select
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={currentSlug}
              onChange={(e) => {
                const product = productOptions.find((option) => option.slug === e.target.value);
                if (!product) return;
                group.linkIds.forEach((id) => onPatchElement({ id, kind: "link", href: `/products/${product.slug}` }));
                group.imageIds.forEach((id) => {
                  if (product.imageUrl?.trim()) {
                    onPatchElement({ id, kind: "image", imageUrl: product.imageUrl });
                  }
                });
                if (group.titleId) {
                  onPatchElement({ id: group.titleId, kind: "text", text: product.title });
                }
                if (group.priceId) {
                  onPatchElement({ id: group.priceId, kind: "text", text: product.priceLabel });
                }
              }}
            >
              <option value="">— Ürün seç —</option>
              {productOptions.map((product) => (
                <option key={product.slug} value={product.slug}>
                  {product.title} ({product.slug})
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}

export function MirrorSectionFieldsPanel({
  section,
  sectionEdit,
  fields,
  productOptions,
  elements,
  swiperAutoplayMs,
  blogPosts,
  onBlogImageSaved,
  onPatchSection,
  onPatchElement,
}: {
  section: MirrorPageSection;
  sectionEdit: MirrorPageSectionEdit | undefined;
  fields: EditableFieldDef[];
  productOptions: AdminProductOption[];
  elements: Record<string, MirrorElementEdit> | undefined;
  swiperAutoplayMs: number | null;
  blogPosts?: BlogPostAdminEditorRow[];
  onBlogImageSaved?: () => void;
  onPatchSection: (patch: MirrorPageSectionEdit) => void;
  onPatchElement: (edit: MirrorElementEdit) => void;
}) {
  const mediaItems = mergeMediaGridEdits(section.mediaGridDefaults, sectionEdit?.mediaGridItems);
  const videoValue = mergeVideoSectionEdit(section.videoDefaults, sectionEdit?.video);
  const gridCols = mergeCollectionGridColumns(
    section.collectionGridDefaults,
    sectionEdit?.collectionGridColumns,
  );
  const productGridCols = mergeProductGridColumns(
    section.productGridDefaults,
    sectionEdit?.productGridColumns,
  );
  const collectionsTabs = mergeCollectionsTabEdits(
    section.collectionsTabDefaults,
    sectionEdit?.collectionsTabs,
  );
  const shopTheLook = mergeShopTheLookEdits(
    section.shopTheLookDefaults,
    sectionEdit?.shopTheLook,
  );
  const featuredBlogPosts = mergeFeaturedBlogEdits(
    section.featuredBlogDefaults,
    sectionEdit?.featuredBlogPosts,
  );
  const scrollingCollections = mergeScrollingCollectionEdits(
    section.scrollingCollectionDefaults,
    sectionEdit?.scrollingCollections,
  );
  const trendingProducts = mergeTrendingProductEdits(
    section.trendingProductDefaults,
    sectionEdit?.trendingProducts,
  );
  const testimonials = mergeTestimonialEdits(
    section.testimonialDefaults,
    sectionEdit?.testimonials,
  );
  const productGroups = getProductSlotGroups(section, fields);
  const filteredFields =
    productGroups.length > 0
      ? fields.filter(
          (field) =>
            !field.id.includes("--img-product-card-image--") &&
            !field.id.includes("--product-title--") &&
            !field.id.includes("--product-actual-price--") &&
            !field.id.includes("--a-product-image--") &&
            !field.id.includes("--a-product-title--"),
        )
      : fields;

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-sky-400">
        Bölüm: {section.label}
      </p>
      <p className="text-xs text-zinc-500">
        Alanları buradan düzenleyin veya ortadaki önizlemede metne tıklayın. Değişiklikler için <strong>Kaydet</strong>.
      </p>

      <label className="flex items-center gap-2 text-sm text-zinc-200">
        <input
          type="checkbox"
          checked={Boolean(sectionEdit?.hidden)}
          onChange={(e) => onPatchSection({ hidden: e.target.checked || undefined })}
        />
        Bu bölümü vitrinde gizle
      </label>

      {swiperAutoplayMs != null ? (
        <label className="block text-xs text-zinc-400">
          Slayt / şerit hızı (ms, 0 = otomatik geçiş kapalı)
          <input
            type="number"
            min={0}
            step={500}
            className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            value={sectionEdit?.autoplayMs ?? swiperAutoplayMs}
            onChange={(e) =>
              onPatchSection({ autoplayMs: parseInt(e.target.value, 10) || 0 })
            }
          />
        </label>
      ) : null}

      {section.type === "media-grid" ? (
        <>
          <p className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
            Sarı karttaki <strong>paragraf</strong> → Açıklama metni. <strong>EXPLORE ALL</strong> butonu →
            Buton yazısı + Buton linki. Aşağıdaki kartlardan doğru olanı açın (genelde Kart 2).
          </p>
          <MediaGridSectionFields
            items={mediaItems}
            onChange={(items) => onPatchSection({ mediaGridItems: items })}
          />
        </>
      ) : null}

      {section.type === "video" ? (
        <MirrorVideoSectionFields
          value={videoValue}
          onChange={(video) => onPatchSection({ video })}
        />
      ) : null}

      {section.type === "main-collection-list" ? (
        <MirrorCollectionGridFields
          value={gridCols}
          max={5}
          title="Koleksiyon kartları"
          description="Masaüstünde kaç koleksiyon kartı yan yana görüneceğini seçin."
          onChange={(c) => onPatchSection({ collectionGridColumns: c as CollectionGridColumns })}
        />
      ) : null}

      {section.type === "main-collection" ? (
        <MirrorCollectionGridFields
          value={productGridCols}
          min={3}
          max={8}
          title="Ürün grid düzeni"
          description="Çok Satanlar sayfasında masaüstünde kaç ürün kartı yan yana görüneceğini seçin (3–8)."
          onChange={(c) => onPatchSection({ productGridColumns: c as ProductGridColumns })}
        />
      ) : null}

      {section.type === "collections-tab" ? (
        <CollectionsTabSectionFields
          tabs={collectionsTabs}
          productOptions={productOptions}
          onChange={(collectionsTabs) => onPatchSection({ collectionsTabs })}
        />
      ) : null}

      {section.type === "shop-the-look" ? (
        <ShopTheLookSectionFields
          value={shopTheLook}
          productOptions={productOptions}
          onChange={(shopTheLook) => onPatchSection({ shopTheLook })}
        />
      ) : null}

      {section.type === "main-blog" && blogPosts !== undefined ? (
        <BlogPostsDbPanel initialPosts={blogPosts} onImageSaved={onBlogImageSaved} />
      ) : null}

      {section.type === "featured-blog" ? (
        <>
          {blogPosts ? (
            <BlogPostsDbPanel initialPosts={blogPosts} onImageSaved={onBlogImageSaved} />
          ) : (
            <FeaturedBlogSectionFields
              posts={featuredBlogPosts}
              onChange={(featuredBlogPosts) => onPatchSection({ featuredBlogPosts })}
            />
          )}
        </>
      ) : null}

      {section.type === "scrolling-collections" && scrollingCollections.length > 0 ? (
        <ScrollingCollectionsSectionFields
          items={scrollingCollections}
          onChange={(scrollingCollections) => onPatchSection({ scrollingCollections })}
        />
      ) : null}

      {section.type === "trending-products" && trendingProducts.length > 0 ? (
        <TrendingProductsSectionFields
          items={trendingProducts}
          productOptions={productOptions}
          onChange={(trendingProducts) => onPatchSection({ trendingProducts })}
        />
      ) : null}

      {section.type === "testimonial" && testimonials.length > 0 ? (
        <TestimonialSectionFields
          items={testimonials}
          onChange={(testimonials) => onPatchSection({ testimonials })}
        />
      ) : null}

      {productGroups.length > 0 ? (
        <GenericProductSlotFields
          section={section}
          fields={fields}
          productOptions={productOptions}
          elements={elements}
          onPatchElement={onPatchElement}
        />
      ) : null}

      {filteredFields.length > 0 ? (
        <div className="space-y-3 border-t border-zinc-700 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Metin & görseller ({filteredFields.length})
          </p>
          {filteredFields.map((field) =>
            field.kind === "html" ? (
              <PlainHtmlTextarea
                key={field.id}
                label={field.label}
                hint={field.hint}
                rows={field.id.includes("revealing") ? 6 : 4}
                valueHtml={fieldValue(field, elements)}
                onChangeHtml={(html) =>
                  onPatchElement({
                    id: field.id,
                    kind: field.kind,
                    html,
                  })
                }
              />
            ) : (
            field.kind === "image" ? (
              <div key={field.id} className="space-y-1">
                {field.hint ? (
                  <p className="text-xs text-zinc-600">{field.hint}</p>
                ) : null}
                <MirrorImageField
                  editorChrome
                  label={field.label}
                  value={fieldValue(field, elements)}
                  onChange={(url) =>
                    onPatchElement({
                      id: field.id,
                      kind: field.kind,
                      imageUrl: url,
                    })
                  }
                />
              </div>
            ) : (
            <label key={field.id} className="block text-xs text-zinc-400">
              {field.label}
              {field.hint ? (
                <span className="mt-0.5 block font-normal text-zinc-600">{field.hint}</span>
              ) : null}
                <textarea
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  rows={field.id.includes("revealing") ? 8 : 2}
                  value={fieldValue(field, elements)}
                  onChange={(e) =>
                    onPatchElement({
                      id: field.id,
                      kind: field.kind,
                      text: e.target.value,
                    })
                  }
                />
            </label>
            )
            ),
          )}
        </div>
      ) : section.type !== "media-grid" &&
        section.type !== "video" &&
        section.type !== "main-collection-list" &&
        section.type !== "main-collection" &&
        section.type !== "collections-tab" &&
        section.type !== "shop-the-look" &&
        section.type !== "featured-blog" &&
        section.type !== "main-blog" &&
        section.type !== "scrolling-collections" &&
        section.type !== "trending-products" &&
        section.type !== "testimonial" ? (
        <p className="text-xs text-zinc-600">Bu bölümde otomatik alan bulunamadı; önizlemede tıklayarak seçin.</p>
      ) : null}
    </div>
  );
}
