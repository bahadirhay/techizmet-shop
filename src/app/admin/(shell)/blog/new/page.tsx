import Link from "next/link";
import { BlogPostForm } from "@/components/admin/BlogPostForm";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewBlogPostPage() {
  return (
    <div>
      <Link href="/admin/blog" className="text-sm text-[var(--kn-brand)] underline">
        ← Blog yazıları
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Yeni blog yazısı</h1>
      <BlogPostForm
        initial={{
          slug: "",
          titleTr: "",
          titleEn: "",
          excerptTr: "",
          excerptEn: "",
          bodyTr: "",
          bodyEn: "",
          imageUrl: "",
          author: "",
          publishedAt: todayIso(),
          published: false,
          featuredOnHome: false,
          sortOrder: "0",
          seoTitle: "",
          seoDescription: "",
        }}
      />
    </div>
  );
}
