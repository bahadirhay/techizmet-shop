import type { ShopLocale } from "@/lib/i18n/locale";
import type { NavMenuMegaMeta } from "@/lib/nav-menu-link";
import {
  navItemLabel,
  type NavDropdownColumn,
  type NavDropdownLink,
  type StoreNavItem,
} from "@/lib/store-navigation";

export type ResolvedNavLink = { href: string; label: string };
export type ResolvedNavColumn = { title: string; href?: string; links: ResolvedNavLink[] };

export type MegaNavProduct = {
  href: string;
  title: string;
  imageUrl: string;
  priceLabel: string;
  compareLabel?: string | null;
};

export type ResolvedNavItem = {
  href: string;
  label: string;
  mega?: NavMenuMegaMeta;
  /** Mega sağ panel — kaydırmalı ürün kartları */
  products?: MegaNavProduct[];
  columns?: ResolvedNavColumn[];
  children?: ResolvedNavLink[];
};

export type StoreCollectionNav = { slug: string; title: string };

function linkLabel(link: NavDropdownLink, locale: ShopLocale): string {
  return locale === "tr" ? link.labelTr || link.labelEn : link.labelEn || link.labelTr;
}

function columnTitle(col: NavDropdownColumn, locale: ShopLocale): string {
  return locale === "tr" ? col.titleTr || col.titleEn : col.titleEn || col.titleTr;
}

function mapColumns(cols: NavDropdownColumn[], locale: ShopLocale): ResolvedNavColumn[] {
  return cols
    .map((col) => ({
      title: columnTitle(col, locale),
      links: (col.links ?? [])
        .filter((l) => l.href?.trim())
        .map((l) => ({
          href: l.href.trim(),
          label: linkLabel(l, locale),
        })),
    }))
    .filter((c) => c.title || c.links.length > 0);
}

function collectionsColumns(
  collections: StoreCollectionNav[],
  locale: ShopLocale,
): ResolvedNavColumn[] {
  if (!collections.length) return [];
  return [
    {
      title: locale === "tr" ? "Koleksiyonlar" : "Collections",
      links: collections.map((c) => ({
        href: `/collections/${c.slug}`,
        label: c.title,
      })),
    },
  ];
}

/** Admin menüsü + koleksiyonlar → vitrin dropdown verisi */
export function resolveStoreNavItems(
  items: StoreNavItem[],
  locale: ShopLocale,
  collections: StoreCollectionNav[] = [],
): ResolvedNavItem[] {
  return items.map((item) => {
    const base: ResolvedNavItem = {
      href: item.href,
      label: navItemLabel(item, locale),
    };

    if (item.dropdown === "collections") {
      const cols = collectionsColumns(collections, locale);
      if (cols.length) return { ...base, columns: cols };
    }

    if (item.dropdown === "manual" && item.columns?.length) {
      const cols = mapColumns(item.columns, locale);
      if (cols.length) return { ...base, columns: cols };
    }

    if (item.children?.length) {
      const children = item.children
        .filter((l) => l.href?.trim())
        .map((l) => ({
          href: l.href.trim(),
          label: linkLabel(l, locale),
        }));
      if (children.length) return { ...base, children };
    }

    return base;
  });
}
