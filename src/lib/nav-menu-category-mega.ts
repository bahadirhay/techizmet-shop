import { categoryDisplayTitle } from "@/lib/category-display-title";
import type { ShopLocale } from "@/lib/i18n/locale";
import { categoryProductHref, parseNavLinkTarget } from "@/lib/nav-menu-link";
import type { NavNode } from "@/lib/navigation-shared";
import { prisma } from "@/lib/prisma";

type CategoryRow = { id: string; slug: string; title: string };

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
      mega.featuredImageUrl2 ||
      mega.featuredSecondaryImageUrl ||
      mega.promoImageUrl ||
      mega.promoImageUrl2 ||
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
  labelTr: string,
  labelEn: string,
  href: string,
  children: NavNode[] = [],
): NavNode {
  return {
    id,
    labelTr,
    labelEn,
    href,
    linkTarget: null,
    openInNewTab: false,
    children,
  };
}

function catLabels(cat: CategoryRow): { labelTr: string; labelEn: string } {
  return {
    labelTr: cat.title,
    labelEn: categoryDisplayTitle(cat, "en"),
  };
}

/** Kategori bağlantılı üst menü — alt sütun yoksa kategori ağacından mega sütun üret */
function buildColumnsFromCategory(
  node: NavNode,
  cat: CategoryRow,
  childrenOf: (parentId: string) => CategoryRow[],
): NavNode[] {
  const root = catLabels(cat);
  const subs = childrenOf(cat.id);
  if (!subs.length) {
    return [
      syntheticNode(
        `syn-col-${node.id}`,
        megaColumnTitle(node, root.labelTr),
        megaColumnTitle(node, root.labelEn),
        categoryProductHref(cat.slug),
        [
          syntheticNode(
            `syn-link-${node.id}-${cat.slug}`,
            root.labelTr,
            root.labelEn,
            categoryProductHref(cat.slug),
          ),
        ],
      ),
    ];
  }

  const hasNested = subs.some((sub) => childrenOf(sub.id).length > 0);
  if (!hasNested) {
    const subLinks = subs.map((sub) => {
      const labels = catLabels(sub);
      return syntheticNode(
        `syn-link-${node.id}-${sub.slug}`,
        labels.labelTr,
        labels.labelEn,
        categoryProductHref(sub.slug),
      );
    });
    return [
      syntheticNode(
        `syn-col-${node.id}`,
        megaColumnTitle(node, root.labelTr),
        megaColumnTitle(node, root.labelEn),
        categoryProductHref(cat.slug),
        subLinks,
      ),
    ];
  }

  return subs.map((sub) => {
    const subLabels = catLabels(sub);
    const grandchildren = childrenOf(sub.id);
    const links =
      grandchildren.length > 0
        ? grandchildren.map((gc) => {
            const gcLabels = catLabels(gc);
            return syntheticNode(
              `syn-link-${node.id}-${gc.slug}`,
              gcLabels.labelTr,
              gcLabels.labelEn,
              categoryProductHref(gc.slug),
            );
          })
        : [
            syntheticNode(
              `syn-link-${node.id}-${sub.slug}`,
              subLabels.labelTr,
              subLabels.labelEn,
              categoryProductHref(sub.slug),
            ),
          ];
    return syntheticNode(
      `syn-col-${node.id}-${sub.slug}`,
      subLabels.labelTr,
      subLabels.labelEn,
      categoryProductHref(sub.slug),
      links,
    );
  });
}

function categorySlugForNode(node: NavNode): string | null {
  const parsed = parseNavLinkTarget(node.linkTarget);
  return parsed.target?.trim() || categorySlugFromHref(node.href) || null;
}

/** DB’de labelEn=title olan kategori satırlarını İngilizce etiketle güncelle */
function applyCategoryEnglishLabels(nodes: NavNode[], bySlug: Map<string, CategoryRow>): NavNode[] {
  return nodes.map((node) => {
    const children = node.children.length
      ? applyCategoryEnglishLabels(node.children, bySlug)
      : node.children;
    const slug = categorySlugForNode(node);
    const cat = slug ? bySlug.get(slug) : undefined;
    if (!cat) return children === node.children ? node : { ...node, children };
    return {
      ...node,
      labelEn: categoryDisplayTitle(cat, "en"),
      children,
    };
  });
}

export async function injectCategoryColumnsIntoTree(
  nodes: NavNode[],
  siteId: string,
  _locale: ShopLocale,
): Promise<NavNode[]> {
  const categories = await prisma.storeCategory.findMany({
    where: { siteId, active: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, slug: true, title: true, parentId: true, sortOrder: true },
  });
  if (!categories.length) return nodes;

  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const withEnLabels = applyCategoryEnglishLabels(nodes, bySlug);

  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  return withEnLabels.map((node) => {
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
          syntheticNode(`syn-empty-${node.id}`, node.labelTr, node.labelEn || node.labelTr, node.href),
        ],
      };
    }

    /** Elle yapılandırılmış sütunlar admin önceliğinde */
    if (node.children.length > 0) return node;

    const columns = buildColumnsFromCategory(node, cat, childrenOf);
    return { ...node, children: columns };
  });
}
