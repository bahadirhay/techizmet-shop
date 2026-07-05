import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { ThemeShellSectionsView } from "@/components/store/ThemeShellSectionsView";
import { listPublishedBlogPosts } from "@/lib/blog/blog-posts-server";
import { mirrorBlogListHtmlExists } from "@/lib/mirror-html-path";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { getHomepageMode, getSiteBranding, getSiteSeo, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { getStoreLocale } from "@/lib/i18n/server";
import { resolveThemeShellVitrinRouteContent } from "@/lib/theme-shell-vitrin-route-content";
import { ensureStoreTenant } from "@/lib/store-tenant";
import {
  isThemeShellEnabledForVitrinRoutePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

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

export default async function BlogNewsListPage({
  searchParams,
}: {
  searchParams: Promise<ThemeShellPilotQuery>;
}) {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);
  const query = await searchParams;
  const themeShellLive = readThemeShellPilotLive();
  const useThemeShell =
    homepageMode === "mirror" &&
    mirrorBlogListHtmlExists() &&
    isThemeShellEnabledForVitrinRoutePath("/blogs/news", query, themeShellLive);

  if (useThemeShell) {
    const locale = await getStoreLocale();
    const tenant = await ensureStoreTenant();
    const content = await resolveThemeShellVitrinRouteContent(
      site.id,
      site.name,
      tenant.slug,
      "/blogs/news",
      locale,
    );
    if (!content) notFound();
    return <ThemeShellSectionsView content={content} withVitrinBoot />;
  }

  if (homepageMode !== "mirror" || !mirrorBlogListHtmlExists()) {
    notFound();
  }

  const posts = await listPublishedBlogPosts(site.id);
  if (!posts.length) notFound();

  return <MirrorVitrinFrame pageKey="blog-news" />;
}
