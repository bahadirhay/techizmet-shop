import { getPublicSiteUrl, toAbsoluteMediaUrl, toAbsoluteUrl } from "@/lib/seo/site-url";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteBranding, getSiteSeo } from "@/lib/site-settings";

export function buildOrganizationJsonLd(settings: SiteSettings, siteName: string) {
  const origin = getPublicSiteUrl();
  const seo = getSiteSeo(settings, siteName);
  const branding = getSiteBranding(settings);
  const logo = toAbsoluteMediaUrl(branding.logoUrl, origin);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: seo.organizationName?.trim() || siteName,
    url: origin,
    ...(logo ? { logo } : {}),
    ...(seo.metaDescription?.trim() ? { description: seo.metaDescription.trim() } : {}),
  };
}

export function buildWebSiteJsonLd(settings: SiteSettings, siteName: string) {
  const origin = getPublicSiteUrl();
  const seo = getSiteSeo(settings, siteName);

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: seo.siteTitle,
    url: origin,
    ...(seo.metaDescription?.trim() ? { description: seo.metaDescription.trim() } : {}),
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/collections/all?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildWebPageJsonLd(input: {
  name: string;
  description?: string | null;
  path: string;
  siteName: string;
}) {
  const origin = getPublicSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    url: toAbsoluteUrl(input.path, origin),
    ...(input.description?.trim() ? { description: input.description.trim().slice(0, 2000) } : {}),
    isPartOf: { "@type": "WebSite", name: input.siteName, url: origin },
  };
}

export function buildBlogPostingJsonLd(input: {
  headline: string;
  description?: string | null;
  path: string;
  imageUrl?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  author?: string | null;
  siteName: string;
  articleSection?: string | null;
}) {
  const origin = getPublicSiteUrl();
  const image = toAbsoluteMediaUrl(input.imageUrl, origin);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.headline,
    url: toAbsoluteUrl(input.path, origin),
    ...(input.description?.trim() ? { description: input.description.trim().slice(0, 2000) } : {}),
    ...(image ? { image } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.articleSection?.trim() ? { articleSection: input.articleSection.trim() } : {}),
    ...(input.author?.trim()
      ? { author: { "@type": "Person", name: input.author.trim() } }
      : { author: { "@type": "Organization", name: input.siteName } }),
    publisher: { "@type": "Organization", name: input.siteName, url: origin },
    mainEntityOfPage: toAbsoluteUrl(input.path, origin),
  };
}

/** Google Haberler / SWG ile uyumlu haber şeması */
export function buildNewsArticleJsonLd(input: {
  headline: string;
  description?: string | null;
  path: string;
  imageUrl?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  author?: string | null;
  siteName: string;
  settings: SiteSettings;
  articleSection?: string | null;
}) {
  const origin = getPublicSiteUrl();
  const seo = getSiteSeo(input.settings, input.siteName);
  const branding = getSiteBranding(input.settings);
  const image = toAbsoluteMediaUrl(input.imageUrl, origin);
  const logo = toAbsoluteMediaUrl(branding.logoUrl, origin);
  const publisherName = seo.organizationName?.trim() || input.siteName;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: input.headline,
    url: toAbsoluteUrl(input.path, origin),
    ...(input.description?.trim() ? { description: input.description.trim().slice(0, 2000) } : {}),
    ...(image ? { image: [image] } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.articleSection?.trim() ? { articleSection: input.articleSection.trim() } : {}),
    ...(input.author?.trim()
      ? { author: { "@type": "Person", name: input.author.trim() } }
      : { author: { "@type": "Organization", name: publisherName } }),
    publisher: {
      "@type": "Organization",
      name: publisherName,
      url: origin,
      ...(logo ? { logo: { "@type": "ImageObject", url: logo } } : {}),
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": toAbsoluteUrl(input.path, origin),
    },
    isAccessibleForFree: true,
  };
}
