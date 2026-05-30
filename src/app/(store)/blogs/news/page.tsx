import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { listPublishedBlogPosts } from "@/lib/blog/blog-posts-server";
import { mirrorBlogListHtmlExists } from "@/lib/mirror-html-path";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { getHomepageMode, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildSiteMetadata();
  return { ...base, title: `Blog — ${base.title ?? "Mağaza"}` };
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
