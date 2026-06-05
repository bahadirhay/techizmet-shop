import type { Metadata } from "next";
import { getPublicSiteUrl, toAbsoluteMediaUrl, toAbsoluteUrl } from "@/lib/seo/site-url";

export type PageSeoInput = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  canonicalPath: string;
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
  };

  return {
    ...base,
    title,
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
