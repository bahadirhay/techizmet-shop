import { prisma } from "@/lib/prisma";

export function productBlogSlug(productSlug: string): string {
  return `urun-${productSlug.trim()}`;
}

export async function loadProductBlogBody(
  siteId: string,
  productSlug: string,
): Promise<{ title: string; bodyHtml: string; href: string } | null> {
  const post = await prisma.storeBlogPost.findFirst({
    where: {
      siteId,
      slug: productBlogSlug(productSlug),
      published: true,
    },
    select: { slug: true, titleTr: true, bodyTr: true },
  });
  if (!post?.bodyTr?.trim()) return null;
  return {
    title: post.titleTr,
    bodyHtml: post.bodyTr,
    href: `/blogs/news/${encodeURIComponent(post.slug)}`,
  };
}
