import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffPage();
  const { id } = await params;
  const post = await prisma.storeBlogPost.findFirst({ where: { id, siteId: auth.siteId } });
  if (!post) notFound();

  const publishedAt = post.publishedAt
    ? post.publishedAt.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Link href="/admin/blog" className="text-sm text-[var(--kn-brand)] underline">
        ← Blog yazıları
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Blog yazısını düzenle</h1>
      <p className="mt-1 text-sm text-zinc-500">{post.titleTr}</p>
      <BlogPostForm
        initial={{
          id: post.id,
          slug: post.slug,
          titleTr: post.titleTr,
          titleEn: post.titleEn ?? "",
          excerptTr: post.excerptTr ?? "",
          excerptEn: post.excerptEn ?? "",
          bodyTr: post.bodyTr,
          bodyEn: post.bodyEn ?? "",
          imageUrl: post.imageUrl ?? "",
          author: post.author ?? "",
          publishedAt,
          published: post.published,
          featuredOnHome: post.featuredOnHome,
          sortOrder: String(post.sortOrder),
          seoTitle: post.seoTitle ?? "",
          seoDescription: post.seoDescription ?? "",
        }}
      />
    </div>
  );
}
