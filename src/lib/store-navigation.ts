import type { ShopLocale } from "@/lib/i18n/locale";
import { localizeMirrorTextForLocale } from "@/lib/mirror-en-locale";
import type { SiteSettings } from "@/lib/site-settings";

export type NavDropdownLink = {
  id: string;
  href: string;
  labelTr: string;
  labelEn: string;
};

export type NavDropdownColumn = {
  id: string;
  titleTr: string;
  titleEn: string;
  links: NavDropdownLink[];
};

/** none = düz link; collections = DB koleksiyonları; manual = sütunlu mega menü */
export type NavDropdownMode = "none" | "collections" | "manual";

export type StoreNavItem = {
  id: string;
  href: string;
  labelTr: string;
  labelEn: string;
  visible?: boolean;
  dropdown?: NavDropdownMode;
  /** manual mod — sütunlu alt menü */
  columns?: NavDropdownColumn[];
  /** basit tek sütun liste (manuel linkler) */
  children?: NavDropdownLink[];
};

export const DEFAULT_STORE_NAV: StoreNavItem[] = [
  { id: "home", href: "/", labelTr: "Ana Sayfa", labelEn: "Home" },
  { id: "best", href: "/collections/all", labelTr: "Çok Satanlar", labelEn: "Best Sellers" },
  {
    id: "collections",
    href: "/collections",
    labelTr: "Koleksiyonlar",
    labelEn: "Collections",
    dropdown: "collections",
  },
  { id: "about", href: "/pages/about", labelTr: "Hakkımızda", labelEn: "About" },
  { id: "contact", href: "/pages/contact", labelTr: "İletişim", labelEn: "Contact" },
];

function newLocalId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeDropdownLink(raw: unknown): NavDropdownLink | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const href = typeof o.href === "string" ? o.href.trim() : "";
  if (!href) return null;
  return {
    id: typeof o.id === "string" ? o.id : newLocalId(),
    href,
    labelTr: typeof o.labelTr === "string" ? o.labelTr : "",
    labelEn: typeof o.labelEn === "string" ? o.labelEn : "",
  };
}

function normalizeColumn(raw: unknown): NavDropdownColumn | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const links = Array.isArray(o.links)
    ? o.links.map(normalizeDropdownLink).filter((l): l is NavDropdownLink => l !== null)
    : [];
  return {
    id: typeof o.id === "string" ? o.id : newLocalId(),
    titleTr: typeof o.titleTr === "string" ? o.titleTr : "",
    titleEn: typeof o.titleEn === "string" ? o.titleEn : "",
    links,
  };
}

export function getStoreNavItems(settings: SiteSettings): StoreNavItem[] {
  const raw = settings.theme?.navItems;
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_STORE_NAV;
  return raw
    .filter((i) => i && i.visible !== false && i.href?.trim())
    .map((i) => {
      const dropdown =
        i.dropdown === "collections" || i.dropdown === "manual" ? i.dropdown : undefined;
      const columns = Array.isArray(i.columns)
        ? i.columns.map(normalizeColumn).filter((c): c is NavDropdownColumn => c !== null)
        : undefined;
      const children = Array.isArray(i.children)
        ? i.children.map(normalizeDropdownLink).filter((l): l is NavDropdownLink => l !== null)
        : undefined;
      return {
        id: i.id || `nav-${i.href}`,
        href: i.href.trim(),
        labelTr: i.labelTr?.trim() || i.labelEn?.trim() || "Link",
        labelEn: i.labelEn?.trim() || i.labelTr?.trim() || "Link",
        visible: true,
        dropdown,
        columns: columns?.length ? columns : undefined,
        children: children?.length ? children : undefined,
      };
    });
}

export function navItemLabel(item: StoreNavItem, locale: ShopLocale): string {
  const raw = locale === "tr" ? item.labelTr : item.labelEn;
  return localizeMirrorTextForLocale(raw, locale);
}
