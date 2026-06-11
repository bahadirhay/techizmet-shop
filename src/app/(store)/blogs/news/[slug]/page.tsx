import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MirrorBlogArticleFrame } from "@/components/store/MirrorBlogArticleFrame";
import { getPublishedBlogPostBySlug } from "@/lib/blog/blog-posts-server";
import { blogTitle } from "@/lib/blog/blog-post-types";
import { getStoreLocale } from "@/lib/i18n/server";
import { resolveMirrorBlogArticleTemplateSlug } from "@/lib/mirror-html-path";
import { JsonLdScript } from "@/components/store/JsonLdScript";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildBlogPostingJsonLd } from "@/lib/seo/site-json-ld";
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
  const title = post.seoTitle?.trim() || `${blogTitle(post, locale)} | ${site.name}`;
  return buildPageMetadata(base, {
    title,
    description: post.seoDescription?.trim() || post.excerptTr?.trim() || base.description,
    imageUrl: post.imageUrl,
    canonicalPath: `/blogs/news/${slug}`,
  });
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

  const jsonLd = buildBlogPostingJsonLd({
    headline: post.seoTitle?.trim() || blogTitle(post, locale),
    description: post.seoDescription?.trim() || post.excerptTr,
    path: `/blogs/news/${slug}`,
    imageUrl: post.imageUrl,
    datePublished: post.publishedAt?.toISOString() ?? null,
    author: post.author,
    siteName: site.name,
  });

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <MirrorBlogArticleFrame slug={slug} locale={locale} />
    </>
  );
}
