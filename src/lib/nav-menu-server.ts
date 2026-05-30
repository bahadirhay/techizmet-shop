import "server-only";

import type { ShopLocale } from "@/lib/i18n/locale";
import type { MegaNavProduct, ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import { buildNavTree } from "@/lib/navigation-shared";
import { injectCategoryColumnsIntoTree } from "@/lib/nav-menu-category-mega";
import { enrichNavMenuItemHref } from "@/lib/nav-menu-resolve-href";
import { resolveMegaMenuProductsBySlug } from "@/lib/nav-menu-mega-products";
import { navTreeToResolved } from "@/lib/nav-tree-resolve";
import { prisma } from "@/lib/prisma";

function isCollectionsHref(href: string) {
  const h = href.replace(/\/$/, "").split("?")[0];
  return h === "/collections" || h.endsWith("/collections");
}

async function attachCollectionsDropdown(
  items: ResolvedNavItem[],
  siteId: string,
  locale: ShopLocale,
): Promise<ResolvedNavItem[]> {
  const needs = items.some(
    (it) => isCollectionsHref(it.href) && !it.columns?.length && !it.children?.length,
  );
  if (!needs) return items;

  const rows = await prisma.storeCollection.findMany({
    where: { siteId, published: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { slug: true, title: true },
  });
  if (!rows.length) return items;

  const links = rows.map((c) => ({ href: `/collections/${c.slug}`, label: c.title }));

  return items.map((it) => {
    if (!isCollectionsHref(it.href) || it.columns?.length || it.children?.length) return it;
    return {
      ...it,
      children: links,
    };
  });
}

async function attachMegaMenuProducts(
  items: ResolvedNavItem[],
  siteId: string,
): Promise<ResolvedNavItem[]> {
  const slugs = items.flatMap((it) => it.mega?.productSlugs ?? []);
  if (!slugs.length) return items;

  const bySlug = await resolveMegaMenuProductsBySlug(siteId, slugs);

  return items.map((it) => {
    const ordered = (it.mega?.productSlugs ?? [])
      .map((slug) => bySlug.get(slug))
      .filter((p): p is MegaNavProduct => Boolean(p));
    if (!ordered.length) return it;
    return { ...it, products: ordered };
  });
}

export async function getPublishedHeaderNavTree(siteId: string, locale: ShopLocale) {
  const rows = await prisma.navMenuItem.findMany({
    where: { siteId, menuSlug: "header", published: true },
    orderBy: [{ sortOrder: "asc" }, { labelTr: "asc" }],
  });
  if (!rows.length) return null;
  const enriched = rows.map(enrichNavMenuItemHref);
  const tree = await injectCategoryColumnsIntoTree(buildNavTree(enriched), siteId);
  let resolved = navTreeToResolved(tree, locale);
  resolved = await attachCollectionsDropdown(resolved, siteId, locale);
  resolved = await attachMegaMenuProducts(resolved, siteId);
  return resolved;
}
