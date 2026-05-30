import type { NavMenuItem } from "@prisma/client";

export type NavNode = {
  id: string;
  labelTr: string;
  labelEn: string;
  href: string;
  linkTarget: string | null;
  openInNewTab: boolean;
  children: NavNode[];
};

export function normalizeNavHref(href: string): string {
  const t = href.trim();
  if (!t) return "#";
  if (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("mailto:") ||
    t.startsWith("tel:") ||
    t.startsWith("#")
  ) {
    return t;
  }
  if (t === "home") return "/";
  if (t.startsWith("/")) return t;
  return `/${t}`;
}

export function buildNavTree(items: NavMenuItem[]): NavNode[] {
  const byParent = new Map<string | null, NavMenuItem[]>();
  for (const it of items) {
    const k = it.parentId ?? null;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(it);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.labelTr.localeCompare(b.labelTr));
  }
  function toNode(item: NavMenuItem): NavNode {
    const kids = byParent.get(item.id) ?? [];
    return {
      id: item.id,
      labelTr: item.labelTr,
      labelEn: item.labelEn,
      href: normalizeNavHref(item.href),
      linkTarget: item.linkTarget,
      openInNewTab: item.openInNewTab,
      children: kids.map(toNode),
    };
  }
  const roots = byParent.get(null) ?? [];
  return roots.map(toNode);
}
