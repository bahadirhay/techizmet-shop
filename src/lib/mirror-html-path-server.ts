import "server-only";

import { mirrorVitrinApiSrc } from "@/lib/mirror-iframe-src";
import {
  hasPrebuiltMirrorHtml,
  preferPrebuiltMirrorHtml,
} from "@/lib/mirror-prebuilt-io";
import {
  blogArticleMirrorFileRel,
  buildCategoryCollectionMirrorSrc,
  collectionMirrorFileRel,
  mirrorCollectionHtmlExists,
  mirrorProductHtmlExists,
  productMirrorFileRel,
  resolveMirrorBlogArticleTemplateSlug,
} from "@/lib/mirror-html-path";
import { resolveStoreMirrorIframeSrcForRequest } from "@/lib/mirror-prebuilt-resolve-server";
import type { ShopLocale } from "@/lib/i18n/locale";

export async function buildCollectionMirrorSrc(
  slug: string,
  locale: ShopLocale,
  templateSlug: string,
  categorySlug?: string,
  page = 1,
  title?: string,
): Promise<string> {
  if (categorySlug?.trim()) {
    return buildCategoryCollectionMirrorSrc(slug, locale, categorySlug, page, title);
  }
  const diskSlug = mirrorCollectionHtmlExists(slug) ? slug : templateSlug;
  return resolveStoreMirrorIframeSrcForRequest(collectionMirrorFileRel(diskSlug, locale));
}

export async function buildProductMirrorSrc(
  slug: string,
  locale: ShopLocale,
  templateSlug: string,
): Promise<string> {
  const outRel = productMirrorFileRel(slug, locale);
  if (preferPrebuiltMirrorHtml(outRel) && hasPrebuiltMirrorHtml(outRel)) {
    return resolveStoreMirrorIframeSrcForRequest(outRel);
  }

  const diskSlug = mirrorProductHtmlExists(slug) ? slug : templateSlug;
  const sourceRel = productMirrorFileRel(diskSlug, locale);

  if (diskSlug === slug) {
    return resolveStoreMirrorIframeSrcForRequest(sourceRel);
  }

  return mirrorVitrinApiSrc(sourceRel, undefined, { productSlug: slug });
}

export async function buildBlogArticleMirrorSrc(
  slug: string,
  locale: ShopLocale,
): Promise<string | null> {
  const templateSlug = resolveMirrorBlogArticleTemplateSlug(slug);
  if (!templateSlug) return null;

  const outRel = blogArticleMirrorFileRel(slug, locale);
  if (preferPrebuiltMirrorHtml(outRel) && hasPrebuiltMirrorHtml(outRel)) {
    return resolveStoreMirrorIframeSrcForRequest(outRel);
  }

  return mirrorVitrinApiSrc(blogArticleMirrorFileRel(templateSlug, locale), undefined, {
    blogSlug: slug,
  });
}
