import { formatTry } from "@/lib/format";
import { withProductDisplayTitle } from "@/lib/product-display-title";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

export type MirrorSearchProductHit = {
  slug: string;
  title: string;
  imageUrl: string;
  priceLabel: string;
  compareLabel?: string | null;
};

export type MirrorSearchCollectionHit = {
  slug: string;
  title: string;
  imageUrl: string;
};

export type MirrorSearchDrawerPayload = {
  products: MirrorSearchProductHit[];
  collections: MirrorSearchCollectionHit[];
};

export async function loadMirrorSearchDrawerPayload(q = ""): Promise<MirrorSearchDrawerPayload> {
  const site = await getDefaultSite();
  const term = q.trim();
  const contains = { contains: term, mode: "insensitive" as const };

  const [products, collections] = await Promise.all([
    prisma.storeProduct.findMany({
      where: {
        siteId: site.id,
        ...storefrontListedWhere,
        ...(term.length >= 2
          ? {
              OR: [
                { title: contains },
                { description: contains },
                { descriptionHtml: contains },
                { sku: contains },
                { slug: contains },
                { barcode: contains },
              ],
            }
          : {}),
      },
      orderBy: term.length >= 2 ? [{ updatedAt: "desc" }] : [{ title: "asc" }],
      take: term.length >= 2 ? 6 : 4,
      select: {
        slug: true,
        title: true,
        imageUrl: true,
        priceMinor: true,
        compareAtMinor: true,
        weightGrams: true,
        pieceCount: true,
        description: true,
        descriptionHtml: true,
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
    prisma.storeCollection.findMany({
      where: {
        siteId: site.id,
        published: true,
        ...(term.length >= 2
          ? {
              OR: [{ title: contains }, { description: contains }, { slug: contains }],
            }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      take: 3,
      select: { slug: true, title: true, imageUrl: true },
    }),
  ]);

  return {
    products: products.map((product) => {
      const row = withProductDisplayTitle(product);
      return {
      slug: row.slug,
      title: row.title,
      imageUrl: product.imageUrl || product.images[0]?.url || "",
      priceLabel: formatTry(product.priceMinor),
      compareLabel:
        product.compareAtMinor != null && product.compareAtMinor > product.priceMinor
          ? formatTry(product.compareAtMinor)
          : null,
    };
    }),
    collections: collections.map((collection) => ({
      slug: collection.slug,
      title: collection.title,
      imageUrl: collection.imageUrl ?? "",
    })),
  };
}
