import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { findIntentForPath } from "@/lib/seo/search-intent";
import { getSiteBranding, getSiteSettings, getSiteSeo } from "@/lib/site-settings";

export type CollectionSeoContext =
  | {
      kind: "collection";
      metaTitle: string;
      metaDescription: string | null;
      imageUrl: string | null;
      canonicalPath: string;
      breadcrumbLabel: string;
      collectionName: string;
      collectionDescription: string | null;
    }
  | {
      kind: "category";
      metaTitle: string;
      metaDescription: string | null;
      imageUrl: string | null;
      canonicalPath: string;
      breadcrumbLabel: string;
      collectionName: string;
      collectionDescription: string | null;
    }
  | {
      kind: "all";
      metaTitle: string;
      metaDescription: string | null;
      imageUrl: string | null;
      canonicalPath: string;
      breadcrumbLabel: string;
      collectionName: string;
      collectionDescription: string | null;
    };

export const loadCollectionSeo = cache(
  async (slug: string, categorySlug?: string | null): Promise<CollectionSeoContext | null> => {
    const site = await getDefaultSite();

    const settings = await getSiteSettings(site.id);
    const seo = getSiteSeo(settings, site.name);
    const branding = getSiteBranding(settings);
    const defaultOg = seo.ogImageUrl?.trim() || branding.logoUrl?.trim() || null;

    if (categorySlug?.trim()) {
      const cat = await prisma.storeCategory.findFirst({
        where: { siteId: site.id, slug: categorySlug.trim(), active: true },
        select: {
          title: true,
          description: true,
          seoTitle: true,
          seoDescription: true,
          imageUrl: true,
        },
      });
      if (!cat) return null;
      const label = cat.seoTitle?.trim() || cat.title;
      return {
        kind: "category",
        metaTitle: label,
        metaDescription: cat.seoDescription?.trim() || cat.description?.trim().slice(0, 160) || null,
        imageUrl: cat.imageUrl?.trim() || defaultOg,
        canonicalPath: `/collections/all?category=${encodeURIComponent(categorySlug.trim())}`,
        breadcrumbLabel: cat.title,
        collectionName: cat.title,
        collectionDescription: cat.description,
      };
    }

    if (slug === "all") {
      const staticMeta = seo.staticPages?.["/collections/all"];
      const intent = findIntentForPath("/collections/all");
      const intentTitle = intent?.title;
      const intentDesc = intent?.description;
      return {
        kind: "all",
        metaTitle:
          staticMeta?.seoTitle?.trim() ||
          intentTitle ||
          `Tüm ürünler | ${site.name}`,
        metaDescription:
          staticMeta?.seoDescription?.trim() ||
          intentDesc ||
          "Mağazadaki tüm ürünleri keşfedin.",
        imageUrl: staticMeta?.imageUrl?.trim() || defaultOg,
        canonicalPath: "/collections/all",
        breadcrumbLabel: intent?.h1 ?? "Tüm ürünler",
        collectionName: intent?.h1 ?? "Tüm ürünler",
        collectionDescription: staticMeta?.seoDescription?.trim() || intentDesc || null,
      };
    }

    const collection = await prisma.storeCollection.findUnique({
      where: { siteId_slug: { siteId: site.id, slug } },
      select: {
        title: true,
        description: true,
        imageUrl: true,
        published: true,
      },
    });

    if (!collection?.published) return null;

    return {
      kind: "collection",
      metaTitle: `${collection.title} | ${site.name}`,
      metaDescription: collection.description?.trim().slice(0, 160) || null,
      imageUrl: collection.imageUrl?.trim() || defaultOg,
      canonicalPath: `/collections/${slug}`,
      breadcrumbLabel: collection.title,
      collectionName: collection.title,
      collectionDescription: collection.description,
    };
  },
);
