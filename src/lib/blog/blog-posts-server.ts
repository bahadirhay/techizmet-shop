import type { ShopLocale } from "@/lib/i18n/locale";
import {
  blogExcerpt,
  blogPostHref,
  blogTitle,
  formatBlogDateLabel,
  type BlogPostRecord,
} from "@/lib/blog/blog-post-types";
import { blogPostsToFeaturedEdits } from "@/lib/blog/mirror-blog-inject";
import type { FeaturedBlogPostEdit } from "@/lib/mirror-featured-blog";
import { resolveBlogFeaturedImageUrl } from "@/lib/mirror-blog-images-server";
import { prisma } from "@/lib/prisma";

const select = {
  id: true,
  slug: true,
  titleTr: true,
  titleEn: true,
  excerptTr: true,
  excerptEn: true,
  bodyTr: true,
  bodyEn: true,
  imageUrl: true,
  author: true,
  publishedAt: true,
  published: true,
  featuredOnHome: true,
  sortOrder: true,
  seoTitle: true,
  seoDescription: true,
} as const;

export async function getPublishedBlogPostBySlug(
  siteId: string,
  slug: string,
): Promise<BlogPostRecord | null> {
  const row = await prisma.storeBlogPost.findFirst({
    where: { siteId, slug, published: true },
    select,
  });
  return row;
}

export async function listPublishedBlogPosts(siteId: string): Promise<BlogPostRecord[]> {
  return prisma.storeBlogPost.findMany({
    where: { siteId, published: true },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    select,
  });
}

export async function listFeaturedBlogPostsForHome(
  siteId: string,
  locale: ShopLocale,
  limit = 6,
): Promise<FeaturedBlogPostEdit[]> {
  let rows = await prisma.storeBlogPost.findMany({
    where: { siteId, published: true, featuredOnHome: true },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    take: limit,
    select,
  });
  if (!rows.length) {
    rows = await prisma.storeBlogPost.findMany({
      where: { siteId, published: true },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      take: limit,
      select,
    });
  }
  const edits = blogPostsToFeaturedEdits(rows, locale);
  return edits.map((p) => ({
    ...p,
    imageUrl: resolveBlogFeaturedImageUrl(p.postId, p.imageUrl) ?? p.imageUrl,
  }));
}

export function blogPostsToListCards(posts: BlogPostRecord[], locale: ShopLocale) {
  return posts.map((p) => ({
    slug: p.slug,
    title: blogTitle(p, locale),
    excerpt: blogExcerpt(p, locale),
    imageUrl: resolveBlogFeaturedImageUrl(p.slug, p.imageUrl) ?? p.imageUrl ?? undefined,
    dateLabel: formatBlogDateLabel(p.publishedAt, locale),
    author: p.author ?? undefined,
    href: blogPostHref(p.slug),
  }));
}

export { blogPostHref };

export type BlogPostAdminEditorRow = {
  id: string;
  slug: string;
  titleTr: string;
  titleEn: string | null;
  imageUrl: string | null;
  published: boolean;
};

export async function listBlogPostsForAdminEditor(
  siteId: string,
): Promise<BlogPostAdminEditorRow[]> {
  return prisma.storeBlogPost.findMany({
    where: { siteId },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      titleTr: true,
      titleEn: true,
      imageUrl: true,
      published: true,
    },
  });
}
