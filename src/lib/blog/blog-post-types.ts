import type { ShopLocale } from "@/lib/i18n/locale";

export type BlogPostRecord = {
  id: string;
  slug: string;
  titleTr: string;
  titleEn: string | null;
  excerptTr: string | null;
  excerptEn: string | null;
  bodyTr: string;
  bodyEn: string | null;
  imageUrl: string | null;
  author: string | null;
  publishedAt: Date | null;
  updatedAt?: Date | null;
  published: boolean;
  featuredOnHome: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
};

export function blogTitle(post: BlogPostRecord, locale: ShopLocale): string {
  if (locale === "en") return (post.titleEn ?? post.titleTr).trim();
  return post.titleTr.trim();
}

export function blogExcerpt(post: BlogPostRecord, locale: ShopLocale): string {
  if (locale === "en") return (post.excerptEn ?? post.excerptTr ?? "").trim();
  return (post.excerptTr ?? post.excerptEn ?? "").trim();
}

export function blogBody(post: BlogPostRecord, locale: ShopLocale): string {
  if (locale === "en") return (post.bodyEn ?? post.bodyTr).trim();
  return post.bodyTr.trim();
}

export function blogPostHref(slug: string) {
  return `/blogs/news/${slug}`;
}

export function formatBlogDateLabel(d: Date | null | undefined, locale: ShopLocale): string {
  if (!d) return "";
  return d.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Istanbul",
  });
}
