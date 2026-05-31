import type { ShopLocale } from "@/lib/i18n/locale";
import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import type { NavNode } from "@/lib/navigation-shared";
import { parseNavLinkTarget } from "@/lib/nav-menu-link";

function nodeLabel(node: NavNode, locale: ShopLocale): string {
  return locale === "tr" ? node.labelTr || node.labelEn : node.labelEn || node.labelTr;
}

function duplicateMegaColumnTitle(parentLabel: string, columnTitle: string): string {
  const col = columnTitle.trim();
  if (!col) return "";
  const key = col.toLocaleLowerCase("tr-TR");
  if (key === parentLabel.trim().toLocaleLowerCase("tr-TR")) return "";
  return columnTitle;
}

/** Ağaç → vitrin mega / basit dropdown (2. seviye = sütun, 3. seviye = link) */
export function navTreeToResolved(nodes: NavNode[], locale: ShopLocale): ResolvedNavItem[] {
  return nodes.map((node) => resolveNavNode(node, locale));
}

function resolveNavNode(node: NavNode, locale: ShopLocale): ResolvedNavItem {
  const parsed = parseNavLinkTarget(node.linkTarget);
  const base: ResolvedNavItem = {
    href: node.href,
    label: nodeLabel(node, locale),
    mega: parsed.mega,
  };

  if (!node.children.length) return base;

  const parentLabel = nodeLabel(node, locale);
  const columns = node.children
    .map((col) => {
      const title = duplicateMegaColumnTitle(parentLabel, nodeLabel(col, locale));
      const links =
        col.children.length > 0
          ? col.children.map((link) => ({
              href: link.href,
              label: nodeLabel(link, locale),
            }))
          : [];
      return { title, href: col.href !== "#" ? col.href : undefined, links };
    })
    .filter((c) => c.title || c.links.length > 0);

  if (columns.length) return { ...base, columns };

  const children = node.children.map((c) => ({
    href: c.href,
    label: nodeLabel(c, locale),
  }));
  return { ...base, children };
}
