import { MIRROR_PRODUCT_COLLECTIONS } from "@/lib/catalog/mirror-seed";
import { prisma } from "@/lib/prisma";

type ProductRow = { slug: string; collectionId: string | null };

/** Vitrin eşlemesi + DB collectionId — koleksiyondaki ürün sayısı */
export function countProductsInCollection(
  collectionSlug: string,
  products: ProductRow[],
  collectionIdBySlug: Map<string, string>,
): number {
  if (collectionSlug === "all") return products.length;

  const collId = collectionIdBySlug.get(collectionSlug);
  let n = 0;
  for (const p of products) {
    const mirrorColls = MIRROR_PRODUCT_COLLECTIONS[p.slug];
    const inMirror = mirrorColls?.includes(collectionSlug) ?? false;
    const inDb = Boolean(collId && p.collectionId === collId);
    if (inMirror || inDb) n += 1;
  }
  return n;
}

export async function loadCollectionProductCounts(
  siteId: string,
  slugs: string[],
): Promise<Map<string, number>> {
  const [products, collections] = await Promise.all([
    prisma.storeProduct.findMany({
      where: { siteId },
      select: { slug: true, collectionId: true },
    }),
    prisma.storeCollection.findMany({
      where: { siteId },
      select: { id: true, slug: true },
    }),
  ]);

  const idBySlug = new Map(collections.map((c) => [c.slug, c.id]));
  const counts = new Map<string, number>();
  for (const slug of slugs) {
    counts.set(slug, countProductsInCollection(slug, products, idBySlug));
  }
  return counts;
}
