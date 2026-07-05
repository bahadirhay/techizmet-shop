import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { ThemeShellSectionsView } from "@/components/store/ThemeShellSectionsView";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { getSiteBranding, getSiteSettings, getSiteSeo } from "@/lib/site-settings";
import { CollectionsListFallback } from "@/components/store/CollectionsListFallback";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { getStoreLocale } from "@/lib/i18n/server";
import { resolveThemeShellVitrinRouteContent } from "@/lib/theme-shell-vitrin-route-content";
import { ensureStoreTenant } from "@/lib/store-tenant";
import {
  isThemeShellEnabledForVitrinRoutePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const seo = getSiteSeo(settings, site.name);
  const branding = getSiteBranding(settings);
  const base = await buildSiteMetadata();
  const staticMeta = seo.staticPages?.["/collections"];
  return buildPageMetadata(base, {
    title: staticMeta?.seoTitle?.trim() || `Koleksiyonlar | ${site.name}`,
    description:
      staticMeta?.seoDescription?.trim() ||
      `Tüm ürün koleksiyonları — ${site.name}`,
    imageUrl: staticMeta?.imageUrl?.trim() || seo.ogImageUrl?.trim() || branding.logoUrl?.trim() || null,
    canonicalPath: "/collections",
  });
}

export default async function CollectionsIndexPage({
  searchParams,
}: {
  searchParams: Promise<ThemeShellPilotQuery>;
}) {
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  const query = await searchParams;
  const themeShellLive = readThemeShellPilotLive();
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForVitrinRoutePath("/collections", query, themeShellLive);

  if (useThemeShell) {
    const locale = await getStoreLocale();
    const tenant = await ensureStoreTenant();
    const content = await resolveThemeShellVitrinRouteContent(
      site.id,
      site.name,
      tenant.slug,
      "/collections",
      locale,
    );
    if (!content) notFound();
    return <ThemeShellSectionsView content={content} withVitrinBoot />;
  }

  if (homepageMode === "mirror") {
    return <MirrorVitrinFrame pageKey="collections" collectionsSync />;
  }

  return <CollectionsListFallback />;
}
