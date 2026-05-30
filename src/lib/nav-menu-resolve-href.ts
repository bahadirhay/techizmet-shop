import type { NavMenuItem } from "@prisma/client";
import { inferLinkType, resolveNavMenuHref, type NavLinkType } from "@/lib/nav-menu-link";

export function enrichNavMenuItemHref(item: NavMenuItem): NavMenuItem {
  const linkType = inferLinkType(item) as NavLinkType;
  const href = resolveNavMenuHref(linkType, item.linkTarget, item.href);
  return { ...item, linkType, href };
}
