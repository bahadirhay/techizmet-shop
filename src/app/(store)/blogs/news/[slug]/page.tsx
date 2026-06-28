import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticlePageView } from "@/components/store/BlogArticlePageView";
import { getPublishedBlogPostBySlug } from "@/lib/blog/blog-posts-server";
import { blogTitle } from "@/lib/blog/blog-post-types";
import { getStoreLocale } from "@/lib/i18n/server";
import { JsonLdScript } from "@/components/store/JsonLdScript";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildNewsArticleJsonLd } from "@/lib/seo/site-json-ld";
import { blogFeedUrl } from "@/lib/seo/rss-feed";
import { findFaqsForBlogSlug } from "@/lib/seo/search-intent";
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
  const pageMeta = buildPageMetadata(base, {
    title,
    description: post.seoDescription?.trim() || post.excerptTr?.trim() || base.description,
    imageUrl: post.imageUrl,
    canonicalPath: `/blogs/news/${slug}`,
  });
  return {
    ...pageMeta,
    alternates: {
      ...(typeof pageMeta.alternates === "object" ? pageMeta.alternates : {}),
      types: {
        "application/rss+xml": blogFeedUrl(),
      },
    },
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = raw.replace(/\.html$/i, "");
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);
  const locale = await getStoreLocale();

  if (homepageMode !== "mirror") {
    notFound();
  }

  const post = await getPublishedBlogPostBySlug(site.id, slug);
  if (!post) notFound();

  const headline = post.seoTitle?.trim() || blogTitle(post, locale);
  const path = `/blogs/news/${slug}`;
  const publishedIso = post.publishedAt?.toISOString() ?? null;
  const modifiedIso = (post.updatedAt ?? post.publishedAt)?.toISOString() ?? null;

  const jsonLd = buildNewsArticleJsonLd({
    headline,
    description: post.seoDescription?.trim() || post.excerptTr,
    path,
    imageUrl: post.imageUrl,
    datePublished: publishedIso,
    dateModified: modifiedIso,
    author: post.author,
    siteName: site.name,
    settings,
    articleSection: "Blog",
  });

  const blogFaqs = findFaqsForBlogSlug(slug);
  const faqJsonLd = blogFaqs.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: blogFaqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  return (
    <>
      <JsonLdScript data={jsonLd} />
      {faqJsonLd && <JsonLdScript data={faqJsonLd} />}
      <BlogArticlePageView post={post} locale={locale} siteName={site.name} />
    </>
  );
}
