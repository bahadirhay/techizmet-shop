import type { NavMenuItem } from "@prisma/client";
import type { VitrinPageKey } from "@/lib/mirror-vitrin-pages";

export type NavLinkType = "none" | "url" | "page" | "category" | "collection" | "product" | "collections_auto";
export type NavMenuMegaMeta = {
  promoImageUrl?: string;
  featuredImageUrl?: string;
  featuredSecondaryImageUrl?: string;
  featuredTitleTr?: string;
  featuredTitleEn?: string;
  /** Sağ panelde kaydırmalı ürün kartları (slug sırası) */
  productSlugs?: string[];
};

export const NAV_MEGA_PRODUCTS_MAX = 8;

const NAV_META_PREFIX = "__kn:";

function cleanMeta(meta: NavMenuMegaMeta | undefined): NavMenuMegaMeta {
  const trimmed = (v: string | undefined) => {
    const t = v?.trim();
    return t ? t : undefined;
  };
  const productSlugs = Array.isArray(meta?.productSlugs)
    ? [...new Set(meta.productSlugs.map((s) => s?.trim()).filter((s): s is string => Boolean(s)))].slice(
        0,
        NAV_MEGA_PRODUCTS_MAX,
      )
    : undefined;
  return {
    promoImageUrl: trimmed(meta?.promoImageUrl),
    featuredImageUrl: trimmed(meta?.featuredImageUrl),
    featuredSecondaryImageUrl: trimmed(meta?.featuredSecondaryImageUrl),
    featuredTitleTr: trimmed(meta?.featuredTitleTr),
    featuredTitleEn: trimmed(meta?.featuredTitleEn),
    productSlugs: productSlugs?.length ? productSlugs : undefined,
  };
}

function hasMeta(meta: NavMenuMegaMeta): boolean {
  return Boolean(
    meta.promoImageUrl ||
      meta.featuredImageUrl ||
      meta.featuredSecondaryImageUrl ||
      meta.featuredTitleTr ||
      meta.featuredTitleEn ||
      (meta.productSlugs && meta.productSlugs.length > 0),
  );
}

export function parseNavLinkTarget(raw: string | null | undefined): {
  target: string | null;
  mega: NavMenuMegaMeta;
} {
  const value = (raw ?? "").trim();
  if (!value) return { target: null, mega: {} };
  if (!value.startsWith(NAV_META_PREFIX)) return { target: value, mega: {} };
  try {
    const parsed = JSON.parse(value.slice(NAV_META_PREFIX.length)) as {
      t?: string | null;
      mega?: NavMenuMegaMeta;
    };
    const target = typeof parsed.t === "string" ? parsed.t.trim() || null : null;
    return { target, mega: cleanMeta(parsed.mega) };
  } catch {
    return { target: value, mega: {} };
  }
}

export function encodeNavLinkTarget(target: string | null | undefined, mega?: NavMenuMegaMeta): string | null {
  const t = target?.trim() || null;
  const m = cleanMeta(mega);
  if (!hasMeta(m)) return t;
  return `${NAV_META_PREFIX}${JSON.stringify({ t, mega: m })}`;
}

export const NAV_PAGE_OPTIONS: { key: VitrinPageKey | "home"; label: string; href: string }[] = [
  { key: "home", label: "Ana Sayfa", href: "/" },
  { key: "collections-all", label: "En Çok Satanlar / Tüm ürünler", href: "/collections/all" },
  { key: "collections", label: "Koleksiyonlar listesi", href: "/collections" },
  { key: "about", label: "Hakkında", href: "/pages/about" },
  { key: "contact", label: "İletişim", href: "/pages/contact" },
  { key: "faq", label: "SSS / SSS sayfası", href: "/pages/faq" },
];

export function categoryProductHref(slug: string) {
  return `/collections/all?category=${encodeURIComponent(slug)}`;
}

export function collectionHref(slug: string) {
  return `/collections/${encodeURIComponent(slug)}`;
}

export function productHref(slug: string) {
  return `/products/${encodeURIComponent(slug)}`;
}

export function inferLinkType(item: Pick<NavMenuItem, "href" | "linkType" | "linkTarget">): NavLinkType {
  const t = item.linkType as NavLinkType;
  if (t === "none" || t === "page" || t === "category" || t === "collection" || t === "product" || t === "collections_auto") {
    return t;
  }
  const h = item.href?.trim() ?? "";
  if (!h || h === "#") return "none";
  if (h.includes("category=")) return "category";
  if (h === "/collections" || h.endsWith("/collections")) return "page";
  const page = NAV_PAGE_OPTIONS.find((p) => p.href === h || p.href === h.replace(/\/$/, ""));
  if (page) return "page";
  if (/^\/collections\/[^/]+/.test(h) && !h.includes("all")) return "collection";
  if (/^\/products\/[^/]+/.test(h)) return "product";
  return "url";
}

export function resolveNavMenuHref(
  linkType: NavLinkType,
  linkTarget: string | null | undefined,
  customHref?: string,
): string {
  const parsedTarget = parseNavLinkTarget(linkTarget).target;
  switch (linkType) {
    case "none":
      return "#";
    case "page": {
      const page = NAV_PAGE_OPTIONS.find((p) => p.key === parsedTarget);
      return (page?.href ?? customHref?.trim()) || "/";
    }
    case "category":
      return parsedTarget ? categoryProductHref(parsedTarget) : (customHref?.trim() || "/collections/all");
    case "collection":
      return parsedTarget ? collectionHref(parsedTarget) : (customHref?.trim() || "/collections");
    case "product":
      return parsedTarget ? productHref(parsedTarget) : (customHref?.trim() || "/products");
    case "collections_auto":
      return "/collections";
    case "url":
    default:
      return customHref?.trim() || "/";
  }
}
