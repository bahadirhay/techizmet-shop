import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticlePageView } from "@/components/store/BlogArticlePageView";
import {
  getBlogPostBySlug,
  getPublishedBlogPostBySlug,
} from "@/lib/blog/blog-posts-server";
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
import { getStaffAccessOptional } from "@/lib/staff-auth";
import {
  isThemeShellEnabledForBlogArticlePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

type BlogArticleSearchParams = ThemeShellPilotQuery & {
  preview?: string | null;
};

async function resolveBlogPostForPage(siteId: string, slug: string, preview?: string | null) {
  const draftPreview = preview === "1" && (await getStaffAccessOptional());
  if (draftPreview) {
    return { post: await getBlogPostBySlug(siteId, slug), draftPreview: true as const };
  }
  return {
    post: await getPublishedBlogPostBySlug(siteId, slug),
    draftPreview: false as const,
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<BlogArticleSearchParams>;
}): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = raw.replace(/\.html$/i, "");
  const query = await searchParams;
  const site = await getDefaultSite();
  const { post, draftPreview } = await resolveBlogPostForPage(site.id, slug, query.preview);
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
    ...(draftPreview && !post.published
      ? { robots: { index: false, follow: false } }
      : {}),
    alternates: {
      ...(typeof pageMeta.alternates === "object" ? pageMeta.alternates : {}),
      types: {
        "application/rss+xml": blogFeedUrl(),
      },
    },
  };
}

export default async function BlogArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<BlogArticleSearchParams>;
}) {
  const { slug: raw } = await params;
  const slug = raw.replace(/\.html$/i, "");
  const query = await searchParams;
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);
  const locale = await getStoreLocale();
  const themeShellLive = readThemeShellPilotLive();
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForBlogArticlePath(`/blogs/news/${slug}`, query, themeShellLive);

  const { post, draftPreview } = await resolveBlogPostForPage(site.id, slug, query.preview);
  if (!post) notFound();

  const headline = post.seoTitle?.trim() || blogTitle(post, locale);
  const path = `/blogs/news/${slug}`;
  const publishedIso = post.publishedAt?.toISOString() ?? null;
  const modifiedIso = (post.updatedAt ?? post.publishedAt)?.toISOString() ?? null;

  const jsonLd =
    post.published && !draftPreview
      ? buildNewsArticleJsonLd({
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
        })
      : null;

  const blogFaqs = post.published ? findFaqsForBlogSlug(slug) : [];
  const faqJsonLd =
    blogFaqs.length > 0
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

  const article = (
    <BlogArticlePageView
      post={post}
      locale={locale}
      siteName={site.name}
      draftPreview={draftPreview && !post.published}
    />
  );

  if (useThemeShell || homepageMode === "mirror") {
    return (
      <>
        {jsonLd ? <JsonLdScript data={jsonLd} /> : null}
        {faqJsonLd ? <JsonLdScript data={faqJsonLd} /> : null}
        {article}
      </>
    );
  }

  return (
    <>
      {jsonLd ? <JsonLdScript data={jsonLd} /> : null}
      {faqJsonLd ? <JsonLdScript data={faqJsonLd} /> : null}
      {article}
    </>
  );
}
