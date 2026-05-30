import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveNavMenuHref } from "@/lib/nav-menu-link";
import { syncHeaderNavFromCategories } from "@/lib/nav-menu-sync-categories";

/** Kullanıcının istediği vitrin üst menüsü — yalnızca butonla */
export const VITRIN_HEADER_MENU_TEMPLATE = [
  { labelTr: "Ana Sayfa", labelEn: "Home", linkType: "page" as const, linkTarget: "home" },
  {
    labelTr: "En Çok Satanlar",
    labelEn: "Best Sellers",
    linkType: "page" as const,
    linkTarget: "collections-all",
  },
  {
    labelTr: "Kategoriler",
    labelEn: "Categories",
    linkType: "page" as const,
    linkTarget: "collections-all",
  },
  {
    labelTr: "Koleksiyonlar",
    labelEn: "Collections",
    linkType: "page" as const,
    linkTarget: "collections",
  },
  { labelTr: "Hakkında", labelEn: "About", linkType: "page" as const, linkTarget: "about" },
  { labelTr: "İletişim", labelEn: "Contact", linkType: "page" as const, linkTarget: "contact" },
];

export async function seedVitrinHeaderMenu(siteId: string, replace = false) {
  if (replace) {
    await prisma.navMenuItem.deleteMany({ where: { siteId, menuSlug: "header" } });
  } else {
    const count = await prisma.navMenuItem.count({ where: { siteId, menuSlug: "header" } });
    if (count > 0) return { created: false, reason: "already_exists" as const };
  }

  let order = 0;
  for (const item of VITRIN_HEADER_MENU_TEMPLATE) {
    await prisma.navMenuItem.create({
      data: {
        siteId,
        menuSlug: "header",
        parentId: null,
        labelTr: item.labelTr,
        labelEn: item.labelEn,
        linkType: item.linkType,
        linkTarget: item.linkTarget,
        href: resolveNavMenuHref(item.linkType, item.linkTarget, "/"),
        sortOrder: order++,
        published: true,
      },
    });
  }
  const categoryCount = await prisma.storeCategory.count({ where: { siteId } });
  if (categoryCount > 0) {
    await syncHeaderNavFromCategories(siteId);
  }

  return { created: true, categoriesSynced: categoryCount > 0 };
}
