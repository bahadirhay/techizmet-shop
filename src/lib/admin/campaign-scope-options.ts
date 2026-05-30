import { prisma } from "@/lib/prisma";

export type CampaignScopeOption = { id: string; label: string };

export async function loadCampaignScopeOptions(siteId: string) {
  const [categories, collections, brands, products] = await Promise.all([
    prisma.storeCategory.findMany({
      where: { siteId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.storeCollection.findMany({
      where: { siteId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.storeBrand.findMany({
      where: { siteId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.storeProduct.findMany({
      where: { siteId },
      orderBy: { title: "asc" },
      select: { id: true, title: true, sku: true },
    }),
  ]);

  return {
    categories: categories.map((c) => ({ id: c.id, label: c.title })),
    collections: collections.map((c) => ({ id: c.id, label: c.title })),
    brands: brands.map((b) => ({ id: b.id, label: b.name })),
    products: products.map((p) => ({
      id: p.id,
      label: p.sku ? `${p.title} (${p.sku})` : p.title,
    })),
  };
}
