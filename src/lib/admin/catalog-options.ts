import { prisma } from "@/lib/prisma";

export type CatalogOpt = { id: string; title: string };
type CategoryOptRow = { id: string; title: string; parentId: string | null };

function categoryPath(
  category: { id: string; title: string; parentId: string | null },
  byId: Map<string, { title: string; parentId: string | null }>,
) {
  const parts = [category.title];
  let parentId = category.parentId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) break;
    parts.unshift(parent.title);
    parentId = parent.parentId;
  }
  return parts.join(" / ");
}

export async function loadCatalogOptions(siteId: string): Promise<{
  collections: CatalogOpt[];
  categories: CatalogOpt[];
  brands: CatalogOpt[];
}> {
  const collections = await prisma.storeCollection.findMany({
    where: { siteId },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  let categories: CategoryOptRow[] = [];
  let brands: CatalogOpt[] = [];

  if (!isStaleClient(prisma)) {
    [categories, brands] = await Promise.all([
      prisma.storeCategory.findMany({
        where: { siteId },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        select: { id: true, title: true, parentId: true },
      }),
      prisma.storeBrand.findMany({
        where: { siteId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }).then((rows) => rows.map((b) => ({ id: b.id, title: b.name }))),
    ]);
  }

  return {
    collections: collections.map((c) => ({ id: c.id, title: c.title })),
    categories: (() => {
      const byId = new Map(categories.map((c) => [c.id, { title: c.title, parentId: c.parentId }]));
      return categories.map((c) => ({ id: c.id, title: categoryPath(c, byId) }));
    })(),
    brands,
  };
}

function isStaleClient(client: typeof prisma): boolean {
  const delegate = (client as typeof prisma & { storeCategory?: { findMany?: unknown } }).storeCategory;
  return typeof delegate?.findMany !== "function";
}
