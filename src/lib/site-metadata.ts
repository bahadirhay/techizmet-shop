import type { Metadata } from "next";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { getDefaultSite } from "@/lib/site";
import { getSiteBranding, getSiteSeo } from "@/lib/site-settings";
import { withBrandAssetVersion } from "@/lib/site-settings-branding";
import { ensureStoreTenant } from "@/lib/store-tenant";
import { blogFeedPath } from "@/lib/seo/rss-feed";

function faviconMime(url: string): string {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".ico")) return "image/x-icon";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/png";
}

export async function buildSiteMetadata(): Promise<Metadata> {
  const tenant = await ensureStoreTenant();
  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const siteOrigin = tenant.publicOrigin || getPublicSiteUrl();
  const seo = getSiteSeo(settings, site.name);
  const branding = getSiteBranding(settings);
  const homeMeta = seo.staticPages?.["/"];
  const pageTitle = homeMeta?.seoTitle?.trim() || seo.siteTitle;
  const pageDescription = homeMeta?.seoDescription?.trim() || seo.metaDescription;
  const ogImage = homeMeta?.imageUrl?.trim() || seo.ogImageUrl?.trim() || branding.logoUrl?.trim();
  const favicon = withBrandAssetVersion(branding.faviconUrl);
  const iconType = faviconMime(favicon);

  return {
    metadataBase: new URL(siteOrigin),
    title: { default: pageTitle, template: `%s · ${seo.siteTitle}` },
    description: pageDescription,
    keywords: seo.metaKeywords || undefined,
    robots: seo.robotsIndex ? { index: true, follow: true } : { index: false, follow: false },
    icons: {
      icon: [{ url: favicon, type: iconType, sizes: "128x128" }],
      shortcut: favicon,
      apple: favicon,
    },
    openGraph: ogImage
      ? { title: pageTitle, description: pageDescription, images: [{ url: ogImage }] }
      : { title: pageTitle, description: pageDescription },
    alternates: {
      types: {
        "application/rss+xml": blogFeedPath(),
      },
    },
    verification:
      seo.googleSiteVerification ||
      seo.yandexVerification ||
      seo.bingVerification ||
      seo.pinterestDomainVerify
        ? {
            ...(seo.googleSiteVerification ? { google: seo.googleSiteVerification } : {}),
            ...(seo.yandexVerification ? { yandex: seo.yandexVerification } : {}),
            ...(seo.bingVerification || seo.pinterestDomainVerify
              ? {
                  other: {
                    ...(seo.bingVerification ? { "msvalidate.01": seo.bingVerification } : {}),
                    ...(seo.pinterestDomainVerify
                      ? { "p:domain_verify": seo.pinterestDomainVerify }
                      : {}),
                  },
                }
              : {}),
          }
        : undefined,
  };
}
