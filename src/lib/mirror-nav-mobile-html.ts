import type { ResolvedNavColumn, ResolvedNavItem, ResolvedNavLink } from "@/lib/mirror-nav-resolve";

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function subLinksHtml(links: ResolvedNavLink[]): string {
  return links
    .map(
      (l) =>
        `<li><a href="${escAttr(l.href)}" class="kn-mobile-nav-sublink">${escText(l.label)}</a></li>`,
    )
    .join("");
}

function columnsPanelHtml(columns: ResolvedNavColumn[], parentHref: string, locale: "tr" | "en"): string {
  const allLabel = locale === "tr" ? "Tümünü gör" : "View all";
  const groups = columns
    .map((col) => {
      const title = col.href
        ? `<a href="${escAttr(col.href)}" class="kn-mobile-nav-group-title">${escText(col.title)}</a>`
        : `<span class="kn-mobile-nav-group-title">${escText(col.title)}</span>`;
      const links = col.links.length
        ? `<ul class="kn-mobile-nav-sublist">${subLinksHtml(col.links)}</ul>`
        : "";
      return `<div class="kn-mobile-nav-group">${title}${links}</div>`;
    })
    .join("");
  return `<a href="${escAttr(parentHref)}" class="kn-mobile-nav-parent-link">${allLabel}</a>${groups}`;
}

function childrenPanelHtml(children: ResolvedNavLink[]): string {
  return `<ul class="kn-mobile-nav-sublist kn-mobile-nav-sublist--flat">${subLinksHtml(children)}</ul>`;
}

function mobileNavItemHtml(it: ResolvedNavItem, index: number, locale: "tr" | "en"): string {
  const n = index + 1;
  const hasSub = Boolean(it.columns?.length || it.children?.length);

  if (!hasSub) {
    return `<li class="mobile-menu--item menu-item-${n} kn-mobile-nav-item" data-mobile-item>
  <a href="${escAttr(it.href)}" class="mobile-menu--link heading-font h5 cursor-pointer">${escText(it.label)}</a>
</li>`;
  }

  const panel = it.columns?.length
    ? columnsPanelHtml(it.columns, it.href, locale)
    : childrenPanelHtml(it.children!);

  return `<li class="mobile-menu--item menu-item-${n} kn-mobile-nav-item kn-mobile-nav-item--has-sub" data-mobile-item>
  <button type="button" class="kn-mobile-menu-toggle heading-font h5" aria-expanded="false">
    <span class="kn-mobile-menu-summary__label">${escText(it.label)}</span>
    <span class="kn-mobile-menu-chevron" aria-hidden="true"></span>
  </button>
  <div class="kn-mobile-nav-panel" hidden>${panel}</div>
</li>`;
}

/** Admin üst menüsü → mobil çekmece listesi */
export function buildMobileNavItemsHtml(nav: ResolvedNavItem[], locale: "tr" | "en" = "tr"): string {
  return nav.map((it, i) => mobileNavItemHtml(it, i, locale)).join("\n");
}
