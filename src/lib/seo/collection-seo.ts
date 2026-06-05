import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

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
        imageUrl: cat.imageUrl,
        canonicalPath: `/collections/all?category=${encodeURIComponent(categorySlug.trim())}`,
        breadcrumbLabel: cat.title,
        collectionName: cat.title,
        collectionDescription: cat.description,
      };
    }

    if (slug === "all") {
      return {
        kind: "all",
        metaTitle: "Tüm ürünler",
        metaDescription: "Mağazadaki tüm ürünleri keşfedin.",
        imageUrl: null,
        canonicalPath: "/collections/all",
        breadcrumbLabel: "Tüm ürünler",
        collectionName: "Tüm ürünler",
        collectionDescription: null,
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
      metaTitle: collection.title,
      metaDescription: collection.description?.trim().slice(0, 160) || null,
      imageUrl: collection.imageUrl,
      canonicalPath: `/collections/${slug}`,
      breadcrumbLabel: collection.title,
      collectionName: collection.title,
      collectionDescription: collection.description,
    };
  },
);
