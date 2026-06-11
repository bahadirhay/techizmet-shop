import type { Metadata } from "next";
import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { getSiteBranding, getSiteSettings, getSiteSeo } from "@/lib/site-settings";
import { CollectionsListFallback } from "@/components/store/CollectionsListFallback";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

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

export default async function CollectionsIndexPage() {
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);

  if (homepageMode === "mirror") {
    return <MirrorVitrinFrame pageKey="collections" collectionsSync />;
  }

  return <CollectionsListFallback />;
}
