import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { listPublishedBlogPosts } from "@/lib/blog/blog-posts-server";
import { mirrorBlogListHtmlExists } from "@/lib/mirror-html-path";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { getHomepageMode, getSiteBranding, getSiteSeo, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const seo = getSiteSeo(settings, site.name);
  const branding = getSiteBranding(settings);
  const base = await buildSiteMetadata();
  const staticMeta = seo.staticPages?.["/blogs/news"];
  return buildPageMetadata(base, {
    title: staticMeta?.seoTitle?.trim() || `Blog | ${site.name}`,
    description:
      staticMeta?.seoDescription?.trim() ||
      `${site.name} blog — haberler, ipuçları ve güncellemeler.`,
    imageUrl: staticMeta?.imageUrl?.trim() || seo.ogImageUrl?.trim() || branding.logoUrl?.trim() || null,
    canonicalPath: "/blogs/news",
  });
}

export default async function BlogNewsListPage() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);

  if (homepageMode !== "mirror" || !mirrorBlogListHtmlExists()) {
    notFound();
  }

  const posts = await listPublishedBlogPosts(site.id);
  if (!posts.length) notFound();

  return <MirrorVitrinFrame pageKey="blog-news" />;
}
