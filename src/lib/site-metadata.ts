import type { Metadata } from "next";
import { getDefaultSite } from "@/lib/site";
import { getSiteBranding, getSiteSeo, getSiteSettings } from "@/lib/site-settings";

export async function buildSiteMetadata(): Promise<Metadata> {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const seo = getSiteSeo(settings, site.name);
  const branding = getSiteBranding(settings);

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
