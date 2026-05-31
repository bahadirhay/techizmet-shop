import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import { MIRROR_NAV_DROPDOWN_BIND_SCRIPT } from "@/lib/mirror-nav-dropdown-bind-script";
import { MIRROR_MOBILE_DRAWER_RESET_SCRIPT } from "@/lib/mirror-mobile-drawer-reset-script";
import { buildMegaDropdownHtml } from "@/lib/mirror-nav-mega-html";
import { buildMobileNavItemsHtml } from "@/lib/mirror-nav-mobile-html";
import { MIRROR_MOBILE_NAV_BIND_SCRIPT } from "@/lib/mirror-nav-mobile-bind-script";

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function dropdownLinksHtml(links: { href: string; label: string }[]): string {
  return links
    .map(
      (l) =>
        `<li><a href="${escAttr(l.href)}">${escText(l.label)}</a></li>`,
    )
    .join("");
}

function simpleDropdownHtml(children: { href: string; label: string }[]): string {
  return `<div class="kn-nav-dropdown kn-nav-dropdown--simple" data-kn-nav-dropdown><div class="kn-nav-dropdown__panel"><ul class="kn-nav-dropdown__links">${dropdownLinksHtml(children)}</ul></div></div>`;
}

function navItemHtml(it: ResolvedNavItem, locale: "tr" | "en"): string {
  const href = escAttr(it.href);
  const label = escText(it.label);
  const hasDropdown = Boolean(it.columns?.length || it.children?.length);

  if (!hasDropdown) {
    return `<li class="header--menu-item"><a href="${href}" class="header--menu-link heading-font text-small">${label}</a></li>`;
  }

  const dropdown = it.columns?.length
    ? buildMegaDropdownHtml(it.columns, locale, it.mega, it.products, {
        href: it.href,
        label: locale === "tr" ? `Tüm ${it.label}` : `All ${it.label}`,
      })
    : simpleDropdownHtml(it.children!);

  return `<li class="header--menu-item kn-nav-has-dropdown" data-kn-nav-parent><a href="${href}" class="header--menu-link heading-font text-small">${label}</a>${dropdown}</li>`;
}

function noJsNavItemHtml(it: ResolvedNavItem): string {
  const href = escAttr(it.href);
  const label = escText(it.label);
  let extra = "";
  const links = it.columns?.flatMap((c) => c.links) ?? it.children ?? [];
  if (links.length) {
    extra = `<ul>${links.map((l) => `<li><a href="${escAttr(l.href)}">${escText(l.label)}</a></li>`).join("")}</ul>`;
  }
  return `<li><a class="header--menu-link" href="${href}">${label}</a>${extra}</li>`;
}

function markHtmlDataset(html: string, key: string): string {
  const attr = `data-${key}="1"`;
  if (html.includes(attr)) return html;
  return html.replace(/<html\b([^>]*)>/i, (_m, attrs) => `<html ${attr}${attrs}>`);
}

const NAV_DROPDOWN_BRIDGE = `<script id="kn-nav-dropdown-bridge">(function(){
  ${MIRROR_MOBILE_DRAWER_RESET_SCRIPT}
  ${MIRROR_NAV_DROPDOWN_BIND_SCRIPT}
  knBindNavDropdown();
  knBindMobileDrawerReset();
})();</script>`;

const MOBILE_NAV_BRIDGE = `<script id="kn-mobile-nav-bridge">(function(){
  ${MIRROR_MOBILE_NAV_BIND_SCRIPT}
  knBindMobileNavAccordion();
})();</script>`;

const HEADER_NAV_UL_RE =
  /<ul([^>]*\bheader--navigation-list\b[^>]*)>[\s\S]*?<\/ul>/i;

const NOJS_NAV_UL_RE =
  /(<div class="no-js-menu"[\s\S]*?<nav[^>]*>\s*<ul[^>]*>)[\s\S]*?(<\/ul>)/i;

const MOBILE_NAV_UL_RE = /<ul([^>]*\bmobile-menu--list\b[^>]*)>[\s\S]*?<\/ul>/i;

/** Sunucu — admin menüsü + hover alt menü */
export function injectNavIntoMirrorHtml(
  html: string,
  nav: ResolvedNavItem[],
  locale: "tr" | "en" = "tr",
): string {
  if (!nav.length) return html;

  const items = nav.map((it) => navItemHtml(it, locale)).join("");
  const noJsItems = nav.map(noJsNavItemHtml).join("");
  const mobileItems = buildMobileNavItemsHtml(nav, locale);
  let out = html;
  let injected = false;

  if (HEADER_NAV_UL_RE.test(html)) {
    out = out.replace(
      HEADER_NAV_UL_RE,
      `<ul$1 data-kn-nav-injected="1">${items}</ul>`,
    );
    injected = true;
  }

  if (MOBILE_NAV_UL_RE.test(out)) {
    out = out.replace(
      MOBILE_NAV_UL_RE,
      `<ul$1 data-kn-mobile-nav-injected="1">${mobileItems}</ul>`,
    );
    injected = true;
  }

  if (NOJS_NAV_UL_RE.test(html)) {
    out = out.replace(NOJS_NAV_UL_RE, `$1${noJsItems}$2`);
  }

  if (!injected) return html;

  out = markHtmlDataset(out, "kn-nav-server");

  if (!out.includes('id="kn-nav-dropdown-bridge"')) {
    out = out.replace(/<\/body>/i, `${NAV_DROPDOWN_BRIDGE}\n${MOBILE_NAV_BRIDGE}</body>`);
  } else if (!out.includes('id="kn-mobile-nav-bridge"')) {
    out = out.replace(/<\/body>/i, `${MOBILE_NAV_BRIDGE}</body>`);
  }

  return out;
}
