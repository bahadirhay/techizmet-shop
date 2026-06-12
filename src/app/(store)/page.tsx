import type { Metadata } from "next";
import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { StorePublicBlocks } from "@/components/store/StorePublicBlocks";
import { headers } from "next/headers";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getStoreMessages } from "@/lib/i18n/messages";
import { localeFromCookieValue } from "@/lib/i18n/locale";
import { getStoreHomepageBlocks } from "@/lib/store-homepage-blocks";
import { getHomepageMode, getSiteSeo } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { resolveStoreBlockMessages } from "@/lib/store-static-texts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function HomePage() {
  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);

  if (homepageMode === "mirror") {
    return <MirrorVitrinFrame pageKey="home" />;
  }

  const h = await headers();
  const locale = localeFromCookieValue(h.get("x-shop-locale") ?? undefined) ?? "tr";
  const messages = getStoreMessages(locale);
  const blocks = await getStoreHomepageBlocks(locale);
  return (
    <StorePublicBlocks
      blocks={blocks}
      messages={resolveStoreBlockMessages(locale, settings.store?.texts, messages.blocks)}
    />
  );
}
