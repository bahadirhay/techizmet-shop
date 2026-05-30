export type StoreCategoryTreeItem = {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
};

function childrenOf(categories: StoreCategoryTreeItem[], parentId: string | null) {
  return categories.filter((category) => (category.parentId ?? null) === parentId);
}

export function getCategoryFilterOptions(
  categories: StoreCategoryTreeItem[],
  activeSlug?: string,
): StoreCategoryTreeItem[] {
  const roots = childrenOf(categories, null);
  const normalizedSlug = activeSlug?.trim();
  if (!normalizedSlug) return roots.length ? roots : categories;

  const active = categories.find((category) => category.slug === normalizedSlug);
  if (!active) return roots.length ? roots : categories;

  const activeChildren = childrenOf(categories, active.id);
  if (activeChildren.length) return activeChildren;

  if (active.parentId) {
    const siblings = childrenOf(categories, active.parentId);
    if (siblings.length) return siblings;
  }

  return roots.length ? roots : [active];
}

export function getCategoryScopeIds(
  categories: StoreCategoryTreeItem[],
  activeSlug?: string,
): string[] | null {
  const normalizedSlug = activeSlug?.trim();
  if (!normalizedSlug) return null;

  const active = categories.find((category) => category.slug === normalizedSlug);
  if (!active) return null;

  const seen = new Set<string>();
  const stack = [active.id];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    childrenOf(categories, id).forEach((child) => stack.push(child.id));
  }

  return [...seen];
}
