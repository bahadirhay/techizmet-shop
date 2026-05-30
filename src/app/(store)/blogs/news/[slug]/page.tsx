import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MirrorBlogArticleFrame } from "@/components/store/MirrorBlogArticleFrame";
import { getPublishedBlogPostBySlug } from "@/lib/blog/blog-posts-server";
import { blogTitle } from "@/lib/blog/blog-post-types";
import { getStoreLocale } from "@/lib/i18n/server";
import { resolveMirrorBlogArticleTemplateSlug } from "@/lib/mirror-html-path";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { getHomepageMode, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = raw.replace(/\.html$/i, "");
  const site = await getDefaultSite();
  const post = await getPublishedBlogPostBySlug(site.id, slug);
  const base = await buildSiteMetadata();
  if (!post) return base;
  const locale = await getStoreLocale();
  return {
    ...base,
    title: post.seoTitle?.trim() || `${blogTitle(post, locale)} — Blog`,
    description: post.seoDescription?.trim() || base.description,
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = raw.replace(/\.html$/i, "");
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);
  const locale = await getStoreLocale();

  if (homepageMode !== "mirror" || !resolveMirrorBlogArticleTemplateSlug(slug)) {
    notFound();
  }
  const post = await getPublishedBlogPostBySlug(site.id, slug);
  if (!post) notFound();

  return <MirrorBlogArticleFrame slug={slug} locale={locale} />;
}
