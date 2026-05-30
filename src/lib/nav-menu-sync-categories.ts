import "server-only";

import { categoryProductHref, resolveNavMenuHref } from "@/lib/nav-menu-link";
import { prisma } from "@/lib/prisma";

/** Ürün & Katalog kategorilerini üst menü mega menüye yazar */
export async function syncHeaderNavFromCategories(siteId: string) {
  const categories = await prisma.storeCategory.findMany({
    where: { siteId, active: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  const roots = categories.filter((c) => !c.parentId);
  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  /** «En Çok Satanlar» /collections/all — href’te "collection" geçer; mega kökü yanlış eşleşmesin */
  let rootNav = await prisma.navMenuItem.findFirst({
    where: {
      siteId,
      menuSlug: "header",
      parentId: null,
      OR: [
        { labelTr: { equals: "Kategoriler", mode: "insensitive" } },
        { labelEn: { equals: "Categories", mode: "insensitive" } },
        { labelTr: { contains: "Kategori", mode: "insensitive" } },
        { labelTr: { contains: "Katalog", mode: "insensitive" } },
      ],
    },
    orderBy: { sortOrder: "asc" },
  });

  if (!rootNav) {
    const maxSort = await prisma.navMenuItem.aggregate({
      where: { siteId, menuSlug: "header", parentId: null },
      _max: { sortOrder: true },
    });
    rootNav = await prisma.navMenuItem.create({
      data: {
        siteId,
        menuSlug: "header",
        parentId: null,
        labelTr: "Kategoriler",
        labelEn: "Categories",
        linkType: "page",
        linkTarget: "collections-all",
        href: resolveNavMenuHref("page", "collections-all", "/collections/all"),
        sortOrder: (maxSort._max?.sortOrder ?? -1) + 1,
        published: true,
      },
    });
  }

  const existingChildren = await prisma.navMenuItem.findMany({
    where: { siteId, menuSlug: "header", parentId: rootNav.id },
    select: { id: true },
  });
  for (const ch of existingChildren) {
    await prisma.navMenuItem.deleteMany({ where: { parentId: ch.id } });
  }
  await prisma.navMenuItem.deleteMany({
    where: { siteId, menuSlug: "header", parentId: rootNav.id },
  });

  let colOrder = 0;
  const sourceRoots = roots.length ? roots : categories;

  for (const cat of sourceRoots) {
    const column = await prisma.navMenuItem.create({
      data: {
        siteId,
        menuSlug: "header",
        parentId: rootNav.id,
        labelTr: cat.title,
        labelEn: cat.title,
        linkType: "category",
        linkTarget: cat.slug,
        href: categoryProductHref(cat.slug),
        sortOrder: colOrder++,
        published: true,
      },
    });

    const subs = childrenOf(cat.id);
    let linkOrder = 0;
    for (const sub of subs) {
      await prisma.navMenuItem.create({
        data: {
          siteId,
          menuSlug: "header",
          parentId: column.id,
          labelTr: sub.title,
          labelEn: sub.title,
          linkType: "category",
          linkTarget: sub.slug,
          href: categoryProductHref(sub.slug),
          sortOrder: linkOrder++,
          published: true,
        },
      });
    }
  }

  return { rootId: rootNav.id, categoryCount: categories.length };
}
