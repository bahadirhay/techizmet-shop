import "server-only";

import { categoryProductHref, parseNavLinkTarget } from "@/lib/nav-menu-link";
import type { NavNode } from "@/lib/navigation-shared";
import { prisma } from "@/lib/prisma";

function categorySlugFromHref(href: string): string | null {
  const q = href.indexOf("?");
  if (q < 0) return null;
  try {
    return new URL(href.slice(q), "http://local").searchParams.get("category");
  } catch {
    return null;
  }
}

function hasMegaAside(linkTarget: string | null): boolean {
  const mega = parseNavLinkTarget(linkTarget).mega;
  return Boolean(
    mega.featuredImageUrl ||
      mega.featuredSecondaryImageUrl ||
      mega.promoImageUrl ||
      (mega.productSlugs && mega.productSlugs.length > 0),
  );
}

/** Üst menü etiketi ile aynı sütun başlığını gösterme (ör. Saç Bakımı → SAÇ BAKIMI) */
function megaColumnTitle(navNode: NavNode, columnTitle: string): string {
  const col = columnTitle.trim();
  if (!col) return "";
  const colKey = col.toLocaleLowerCase("tr-TR");
  const tr = navNode.labelTr.trim().toLocaleLowerCase("tr-TR");
  const en = navNode.labelEn.trim().toLocaleLowerCase("en-US");
  if (colKey === tr || colKey === en) return "";
  return columnTitle;
}

function syntheticNode(
  id: string,
  title: string,
  href: string,
  children: NavNode[] = [],
): NavNode {
  return {
    id,
    labelTr: title,
    labelEn: title,
    href,
    linkTarget: null,
    openInNewTab: false,
    children,
  };
}

/** Kategori bağlantılı üst menü — alt sütun yoksa kategori ağacından mega sütun üret */
export async function injectCategoryColumnsIntoTree(
  nodes: NavNode[],
  siteId: string,
): Promise<NavNode[]> {
  const categories = await prisma.storeCategory.findMany({
    where: { siteId, active: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, slug: true, title: true, parentId: true, sortOrder: true },
  });
  if (!categories.length) return nodes;

  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  return nodes.map((node) => {
    const parsed = parseNavLinkTarget(node.linkTarget);
    const slug = parsed.target?.trim() || categorySlugFromHref(node.href);
    if (!slug && !hasMegaAside(node.linkTarget)) return node;

    const cat = categories.find((c) => c.slug === slug);
    if (!cat) {
      if (!hasMegaAside(node.linkTarget)) return node;
      if (node.children.length) return node;
      return {
        ...node,
        children: [
          syntheticNode(`syn-empty-${node.id}`, node.labelTr, node.href),
        ],
      };
    }

    /** Kategori kök menüsü — alt linkleri her zaman DB ağacından (eski/yanlış manuel alt menüyü ezme) */
    const subs = childrenOf(cat.id);
    const subLinks =
      subs.length > 0
        ? subs.map((sub) =>
            syntheticNode(`syn-link-${node.id}-${sub.slug}`, sub.title, categoryProductHref(sub.slug)),
          )
        : [
            syntheticNode(
              `syn-link-${node.id}-${cat.slug}`,
              cat.title,
              categoryProductHref(cat.slug),
            ),
          ];

    const column = syntheticNode(
      `syn-col-${node.id}`,
      megaColumnTitle(node, cat.title),
      categoryProductHref(cat.slug),
      subLinks,
    );
    return { ...node, children: [column] };
  });
}
