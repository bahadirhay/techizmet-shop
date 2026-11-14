import type { Metadata } from "next";
import { getPublicSiteUrl, toAbsoluteMediaUrl, toAbsoluteUrl } from "@/lib/seo/site-url";

export type PageSeoInput = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  canonicalPath: string;
  /** Blog / haber yazıları için Open Graph article alanları */
  article?: {
    publishedTime?: string | null;
    modifiedTime?: string | null;
    authors?: string[];
    section?: string | null;
  };
};

/** Sayfa başlığı + açıklama + OG + canonical */
export function buildPageMetadata(base: Metadata, input: PageSeoInput): Metadata {
  const origin = getPublicSiteUrl();
  const canonical = toAbsoluteUrl(input.canonicalPath, origin);
  const title = input.title.trim();
  const description = input.description?.trim() || undefined;
  const ogImage = toAbsoluteMediaUrl(input.imageUrl, origin);

  const openGraph: NonNullable<Metadata["openGraph"]> = {
    ...(typeof base.openGraph === "object" ? base.openGraph : {}),
    title,
    description,
    url: canonical,
    ...(ogImage ? { images: [{ url: ogImage, alt: title }] } : {}),
    ...(input.article
      ? {
          type: "article" as const,
          ...(input.article.publishedTime
            ? { publishedTime: input.article.publishedTime }
            : {}),
          ...(input.article.modifiedTime
            ? { modifiedTime: input.article.modifiedTime }
            : {}),
          ...(input.article.authors?.length
            ? { authors: input.article.authors }
            : {}),
          ...(input.article.section?.trim()
            ? { section: input.article.section.trim() }
            : {}),
        }
      : {}),
  };

  return {
    ...base,
    // absolute: şablon uygulanmaz — "X | Marka · Marka" tekrarını önler
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph,
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}
