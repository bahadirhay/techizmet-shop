import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getDefaultSite } from "@/lib/site";
import { getSiteBranding, getSiteSeo } from "@/lib/site-settings";

const buildSiteMetadataCached = unstable_cache(
  async () => {
    const site = await getDefaultSite();
    const settings = await getCachedParsedSiteSettings(site.id);
    const seo = getSiteSeo(settings, site.name);
    const branding = getSiteBranding(settings);
    return { seo, branding };
  },
  ["site-metadata"],
  { revalidate: 300 },
);

export async function buildSiteMetadata(): Promise<Metadata> {
  const { seo, branding } = await buildSiteMetadataCached();

  return {
    title: { default: seo.siteTitle, template: `%s · ${seo.siteTitle}` },
    description: seo.metaDescription,
    keywords: seo.metaKeywords || undefined,
    robots: seo.robotsIndex ? { index: true, follow: true } : { index: false, follow: false },
    icons: { icon: branding.faviconUrl },
    openGraph: seo.ogImageUrl
      ? { title: seo.siteTitle, description: seo.metaDescription, images: [{ url: seo.ogImageUrl }] }
      : { title: seo.siteTitle, description: seo.metaDescription },
    verification: seo.googleSiteVerification
      ? { google: seo.googleSiteVerification }
      : undefined,
  };
}
