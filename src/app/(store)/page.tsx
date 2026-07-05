import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { ThemeShellHomeView } from "@/components/store/ThemeShellHomeView";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { StorePublicBlocks } from "@/components/store/StorePublicBlocks";
import { getStoreLocale } from "@/lib/i18n/server";
import { getStoreMessages } from "@/lib/i18n/messages";
import { getStoreHomepageBlocks } from "@/lib/store-homepage-blocks";
import { getHomepageMode, getSiteSeo } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { resolveStoreBlockMessages } from "@/lib/store-static-texts";
import { ensureStoreTenant } from "@/lib/store-tenant";
import { resolveThemeShellHomeContent } from "@/lib/theme-shell-home-content";
import {
  isThemeShellEnabledForHomePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const seo = getSiteSeo(settings, site.name);
  const base = await buildSiteMetadata();
  const homeMeta = seo.staticPages?.["/"];
  const title = homeMeta?.seoTitle?.trim() || seo.siteTitle;
  const description = homeMeta?.seoDescription?.trim() || seo.metaDescription;
  return {
    ...base,
    title: { absolute: title },
    description,
    openGraph: {
      ...(typeof base.openGraph === "object" ? base.openGraph : {}),
      title,
      description,
    },
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<ThemeShellPilotQuery>;
}) {
  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);
  const query = await searchParams;
  const themeShellLive = process.env.THEME_SHELL_PILOT_LIVE === "1";
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForHomePath("/", query, themeShellLive);

  if (useThemeShell) {
    const locale = await getStoreLocale();
    const tenant = await ensureStoreTenant();
    const content = await resolveThemeShellHomeContent(
      site.id,
      site.name,
      tenant.slug,
      locale,
    );
    if (!content) notFound();
    return <ThemeShellHomeView content={content} />;
  }

  if (homepageMode === "mirror") {
    return <MirrorVitrinFrame pageKey="home" />;
  }

  const locale = await getStoreLocale();
  const messages = getStoreMessages(locale);
  const blocks = await getStoreHomepageBlocks(locale);
  return (
    <StorePublicBlocks
      blocks={blocks}
      messages={resolveStoreBlockMessages(locale, settings.store?.texts, messages.blocks)}
    />
  );
}
