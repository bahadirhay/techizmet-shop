import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticlePageView } from "@/components/store/BlogArticlePageView";
import {
  getBlogPostBySlug,
  getPublishedBlogPostBySlug,
} from "@/lib/blog/blog-posts-server";
import { resolveBlogFaqs } from "@/lib/blog/blog-faq";
import { listRelatedBlogPosts } from "@/lib/blog/related-blog-posts";
import { blogBody, blogTitle, type BlogPostRecord } from "@/lib/blog/blog-post-types";
import type { ShopLocale } from "@/lib/i18n/locale";
import { getStoreLocale } from "@/lib/i18n/server";
import { repairStoredSeoDescription, repairStoredSeoTitle } from "@/lib/seo/seo-text";
import { JsonLdScript } from "@/components/store/JsonLdScript";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbListJsonLd } from "@/lib/seo/json-ld";
import { buildNewsArticleJsonLd } from "@/lib/seo/site-json-ld";
import { blogFeedUrl } from "@/lib/seo/rss-feed";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { getStaffAccessOptional } from "@/lib/staff-auth";
import type { ThemeShellPilotQuery } from "@/lib/theme-shell-pilot";

type BlogArticleSearchParams = ThemeShellPilotQuery & {
  preview?: string | null;
};

/** Kayıtlı SEO başlığı eski üreticiyle kesilmişse ("… Doğal vs | Marka") yazı başlığından onarılır */
function blogMetaTitle(post: BlogPostRecord, locale: ShopLocale, siteName: string): string {
  const stored = post.seoTitle?.trim();
  if (!stored) return `${blogTitle(post, locale)} | ${siteName}`;
  return repairStoredSeoTitle(stored, {
    brandName: siteName,
    sourceTitle: post.titleTr,
    rebuildTruncatedSource: true,
    max: 65,
  });
}

function blogMetaDescription(post: BlogPostRecord, locale: ShopLocale): string {
  const stored = post.seoDescription?.trim();
  if (stored) return repairStoredSeoDescription(stored);
  if (locale === "en") return (post.excerptEn ?? post.excerptTr)?.trim() ?? "";
  return (post.excerptTr ?? post.excerptEn)?.trim() ?? "";
}

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
  const title = blogMetaTitle(post, locale, site.name);
  const publishedIso = post.publishedAt?.toISOString() ?? null;
  const modifiedIso = (post.updatedAt ?? post.publishedAt)?.toISOString() ?? null;
  const pageMeta = buildPageMetadata(base, {
    title,
    description: blogMetaDescription(post, locale) || base.description,
    imageUrl: post.imageUrl,
    canonicalPath: `/blogs/news/${slug}`,
    article: {
      publishedTime: publishedIso,
      modifiedTime: modifiedIso,
      authors: [post.author?.trim() || site.name],
      section: "Blog",
    },
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
  const locale = await getStoreLocale();

  const { post, draftPreview } = await resolveBlogPostForPage(site.id, slug, query.preview);
  if (!post) notFound();

  const headline = post.seoTitle?.trim()
    ? blogMetaTitle(post, locale, site.name)
    : blogTitle(post, locale);
  const path = `/blogs/news/${slug}`;
  const publishedIso = post.publishedAt?.toISOString() ?? null;
  const modifiedIso = (post.updatedAt ?? post.publishedAt)?.toISOString() ?? null;
  const visibleTitle = blogTitle(post, locale);

  const jsonLd =
    post.published && !draftPreview
      ? buildNewsArticleJsonLd({
          headline,
          description: blogMetaDescription(post, locale) || post.excerptTr,
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

  const breadcrumbJsonLd =
    post.published && !draftPreview
      ? buildBreadcrumbListJsonLd([
          { name: "Ana sayfa", path: "/" },
          { name: "Blog", path: "/blogs/news" },
          { name: visibleTitle, path },
        ])
      : null;

  const bodyHtml = blogBody(post, locale);
  const { faqs, renderVisible } = post.published
    ? resolveBlogFaqs(slug, bodyHtml)
    : { faqs: [], renderVisible: false };
  const faqJsonLd =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  const relatedPosts =
    post.published && !draftPreview
      ? await listRelatedBlogPosts(site.id, post, locale, 3)
      : [];

  const article = (
    <BlogArticlePageView
      post={post}
      locale={locale}
      siteName={site.name}
      draftPreview={draftPreview && !post.published}
      relatedPosts={relatedPosts}
      faqs={renderVisible ? faqs : []}
    />
  );

  return (
    <>
      {jsonLd ? <JsonLdScript data={jsonLd} /> : null}
      {breadcrumbJsonLd ? <JsonLdScript data={breadcrumbJsonLd} /> : null}
      {faqJsonLd ? <JsonLdScript data={faqJsonLd} /> : null}
      {article}
    </>
  );
}
