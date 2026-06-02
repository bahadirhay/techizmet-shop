/** Mirror iframe — admin vitrin menüsü (istemci yedek) */

import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import { buildMegaDropdownHtml } from "@/lib/mirror-nav-mega-html";
import { buildMobileNavItemsHtml } from "@/lib/mirror-nav-mobile-html";

export type MirrorNavItem = ResolvedNavItem;

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function dropdownLinksHtml(links: { href: string; label: string }[]): string {
  return links
    .map((l) => `<li><a href="${escAttr(l.href)}">${escText(l.label)}</a></li>`)
    .join("");
}

function navItemHtml(it: ResolvedNavItem, locale: "tr" | "en" = "tr"): string {
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
    : `<div class="kn-nav-dropdown kn-nav-dropdown--simple" data-kn-nav-dropdown><div class="kn-nav-dropdown__panel"><ul class="kn-nav-dropdown__links">${dropdownLinksHtml(it.children!)}</ul></div></div>`;
  return `<li class="header--menu-item kn-nav-has-dropdown" data-kn-nav-parent><a href="${href}" class="header--menu-link heading-font text-small">${label}</a>${dropdown}</li>`;
}

function ensureMegaHost(doc: Document): HTMLElement {
  const root =
    doc.querySelector("sticky-always.header") ??
    doc.querySelector("sticky-on-scroll.header") ??
    doc.querySelector("[data-header-section]");
  let host = doc.getElementById("kn-mega-host");
  if (!host) {
    host = doc.createElement("div");
    host.id = "kn-mega-host";
    host.setAttribute("aria-hidden", "true");
  }
  if (root instanceof HTMLElement && host.parentElement !== root) {
    root.appendChild(host);
  } else if (!root && host.parentElement !== doc.body) {
    doc.body.appendChild(host);
  }
  host.style.removeProperty("top");
  host.style.removeProperty("position");
  return host;
}

function megaUseHost(doc: Document): boolean {
  return doc.defaultView?.matchMedia("(min-width: 992px)").matches ?? false;
}

function closeMobileDrawerOnDesktop(doc: Document) {
  if (!megaUseHost(doc)) return;
  doc.querySelectorAll("#MobileDrawer, [data-drawer='mobile-menu-drawer']").forEach((d) => {
    const el = d as HTMLElement;
    el.classList.remove("show", "active", "open", "is-active");
    el.removeAttribute("open");
    el.style.display = "";
  });
  doc.body.classList.remove("overflow-hidden", "hamburger-menu-open");
  doc.documentElement.classList.remove("overflow-hidden");
  doc.querySelector("[data-mobile-toggler]")?.classList.remove("active");
  const hm = doc.querySelector("hamburger-menu") as HTMLElement & {
    closeHamburger?: () => void;
  } | null;
  if (hm) {
    try {
      hm.closeHamburger?.();
    } catch {
      /* theme */
    }
    hm.classList.remove("active");
    hm.style.display = "";
  }
  doc.querySelectorAll("[data-mobile-item].animate").forEach((el) => {
    el.classList.remove("animate");
  });
}

function initMegaPanels(doc: Document) {
  const host = ensureMegaHost(doc);
  const portal = megaUseHost(doc);
  let idx = 0;
  doc.querySelectorAll(".kn-nav-has-dropdown").forEach((li) => {
    const el = li as HTMLElement;
    let id = el.dataset.knNavMegaId;
    let mega = li.querySelector(".kn-nav-dropdown--fruitser");
    if (!mega && id) {
      mega = host.querySelector(
        `.kn-nav-dropdown--fruitser[data-kn-nav-mega-id="${id}"]`,
      );
    }
    if (!mega) return;
    if (!id) {
      id = String(idx++);
      el.dataset.knNavMegaId = id;
      (mega as HTMLElement).dataset.knNavMegaId = id;
    }
    if (portal) {
      if (mega.parentElement !== host) host.appendChild(mega);
    } else if (mega.parentElement !== li) {
      li.appendChild(mega);
      mega.classList.remove("kn-mega-active");
    }
  });
}

function setActiveMega(doc: Document, li: HTMLElement) {
  if (!megaUseHost(doc)) return;
  const id = li.dataset.knNavMegaId;
  if (!id) return;
  doc.querySelectorAll("#kn-mega-host .kn-nav-dropdown--fruitser").forEach((m) => {
    m.classList.toggle("kn-mega-active", (m as HTMLElement).dataset.knNavMegaId === id);
  });
}

function clearActiveMega(doc: Document) {
  doc.querySelectorAll(".kn-nav-dropdown--fruitser.kn-mega-active").forEach((m) => {
    m.classList.remove("kn-mega-active");
  });
}

let navCloseTimer: ReturnType<typeof setTimeout> | null = null;

function cancelNavClose() {
  if (navCloseTimer) {
    clearTimeout(navCloseTimer);
    navCloseTimer = null;
  }
}

function pointerInNavZone(doc: Document): boolean {
  if (doc.querySelector(".kn-nav-has-dropdown.kn-nav-open:hover")) return true;
  const host = doc.getElementById("kn-mega-host");
  if (host?.matches(":hover")) return true;
  return false;
}

function closeAllNavDropdowns(doc: Document) {
  let hadOpen = false;
  doc.querySelectorAll(".kn-nav-has-dropdown.kn-nav-open").forEach((li) => {
    li.classList.remove("kn-nav-open");
    hadOpen = true;
  });
  if (hadOpen || doc.body.classList.contains("kn-nav-dropdown-open")) {
    doc.body.classList.remove("kn-nav-dropdown-open");
    clearActiveMega(doc);
  }
}

function scheduleNavClose(doc: Document, li: HTMLElement) {
  cancelNavClose();
  navCloseTimer = setTimeout(() => {
    navCloseTimer = null;
    if (pointerInNavZone(doc)) return;
    closeNavDropdown(doc, li);
  }, 240);
}

function openNavDropdown(doc: Document, el: HTMLElement) {
  cancelNavClose();
  doc.querySelectorAll(".kn-nav-has-dropdown.kn-nav-open").forEach((other) => {
    if (other !== el) other.classList.remove("kn-nav-open");
  });
  doc.body.classList.add("kn-nav-dropdown-open");
  el.classList.add("kn-nav-open");
  setActiveMega(doc, el);
}

function closeNavDropdown(doc: Document, el: HTMLElement) {
  cancelNavClose();
  el.classList.remove("kn-nav-open");
  if (!doc.querySelector(".kn-nav-has-dropdown.kn-nav-open")) {
    doc.body.classList.remove("kn-nav-dropdown-open");
    clearActiveMega(doc);
  }
}

function navInternalHref(href: string): string | null {
  if (!href || !href.startsWith("/")) return null;
  if (/^\/(?:api|_next|theme|uploads)\//i.test(href)) return null;
  if (/(?:^|\/)(?:blank|null|undefined)(?:$|[?#/])/i.test(href)) return null;
  return href;
}

function bindMegaLinkClicks(doc: Document) {
  const win = doc.defaultView;
  if (!win || (win as Window & { __knMegaLinksBound?: number }).__knMegaLinksBound) return;
  (win as Window & { __knMegaLinksBound?: number }).__knMegaLinksBound = 1;

  doc.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const t = e.target;
      if (!(t instanceof Element)) return;
      const a = t.closest("#kn-mega-host a[href], .kn-nav-dropdown--simple a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      const href = navInternalHref(a.getAttribute("href")?.trim() ?? "");
      if (!href) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const openLi = doc.querySelector(".kn-nav-has-dropdown.kn-nav-open") as HTMLElement | null;
      if (openLi) closeNavDropdown(doc, openLi);
      try {
        (win.top ?? win).location.assign(href);
      } catch {
        win.location.assign(href);
      }
    },
    true,
  );
}

function extractBgUrl(styleValue: string): string | null {
  const m = styleValue.match(/url\((['"]?)(.*?)\1\)/i);
  const raw = m?.[2]?.trim();
  if (!raw) return null;
  return raw;
}

function preloadMegaTileImages(doc: Document) {
  const win = doc.defaultView as (Window & {
    __knMegaImagePreloaded?: Set<string>;
  }) | null;
  if (!win) return;
  if (!win.__knMegaImagePreloaded) {
    win.__knMegaImagePreloaded = new Set<string>();
  }
  const seen = win.__knMegaImagePreloaded;

  doc.querySelectorAll(".kn-nav-mega__tile-img[style]").forEach((el) => {
    const style = el.getAttribute("style") ?? "";
    const src = extractBgUrl(style);
    if (!src || seen.has(src)) return;
    seen.add(src);
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    try {
      img.fetchPriority = "high";
    } catch {
      // Eski tarayıcılar fetchPriority desteklemeyebilir.
    }
    img.src = src;
  });
}

function bindKnNavDropdown(doc: Document) {
  initMegaPanels(doc);
  preloadMegaTileImages(doc);
  const win = doc.defaultView;
  if (win && !(win as Window & { __knMegaLayoutBound?: number }).__knMegaLayoutBound) {
    (win as Window & { __knMegaLayoutBound?: number }).__knMegaLayoutBound = 1;
    win.addEventListener("resize", () => {
      closeMobileDrawerOnDesktop(doc);
      initMegaPanels(doc);
    });
    const mq = win.matchMedia("(min-width: 992px)");
    const onMq = () => {
      closeMobileDrawerOnDesktop(doc);
      initMegaPanels(doc);
    };
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onMq);
    else if (typeof mq.addListener === "function") mq.addListener(onMq);
  }

  const megaHost = doc.getElementById("kn-mega-host");
  if (megaHost && megaHost.dataset.knHostBound !== "1") {
    megaHost.dataset.knHostBound = "1";
    megaHost.addEventListener("mouseenter", () => {
      cancelNavClose();
      const openLi = doc.querySelector(".kn-nav-has-dropdown.kn-nav-open") as HTMLElement | null;
      if (openLi) openNavDropdown(doc, openLi);
    });
    megaHost.addEventListener("mouseleave", (e) => {
      const openLi = doc.querySelector(".kn-nav-has-dropdown.kn-nav-open") as HTMLElement | null;
      if (!openLi) return;
      if (e.relatedTarget instanceof Node && openLi.contains(e.relatedTarget)) return;
      scheduleNavClose(doc, openLi);
    });
  }

  const headerBar =
    doc.querySelector("sticky-always.header") ?? doc.querySelector("[data-header-section]");
  if (headerBar instanceof HTMLElement && headerBar.dataset.knNavZoneBound !== "1") {
    headerBar.dataset.knNavZoneBound = "1";
    headerBar.addEventListener("mouseenter", cancelNavClose);
  }

  const navMain = doc.querySelector(".header--navigation-main");
  if (navMain instanceof HTMLElement && navMain.dataset.knNavZoneBound !== "1") {
    navMain.dataset.knNavZoneBound = "1";
    navMain.addEventListener("mouseenter", cancelNavClose);
  }

  doc.querySelectorAll(".kn-nav-has-dropdown").forEach((li) => {
    const el = li as HTMLElement;
    if (el.dataset.knNavBound === "1") return;
    el.dataset.knNavBound = "1";
    el.addEventListener("mouseenter", () => openNavDropdown(doc, el));
    el.addEventListener("mouseleave", (e) => {
      if (megaHost && e.relatedTarget instanceof Node && megaHost.contains(e.relatedTarget)) return;
      scheduleNavClose(doc, el);
    });
  });

  doc.querySelectorAll(".header--navigation-list > .header--menu-item:not(.kn-nav-has-dropdown)").forEach((li) => {
    const el = li as HTMLElement;
    if (el.dataset.knNavPlainBound === "1") return;
    el.dataset.knNavPlainBound = "1";
    el.addEventListener("mouseenter", () => closeAllNavDropdowns(doc));
  });

  bindMegaLinkClicks(doc);
}

/** Sunucu menüsü varken yalnızca hover bağlantısını yenile (HTML’i silme) */
export function rebindMirrorNavDropdown(doc: Document) {
  bindKnNavDropdown(doc);
}

export function applyMirrorNavigation(doc: Document, nav: MirrorNavItem[], locale: "tr" | "en" = "tr") {
  if (!nav.length) return;

  doc.querySelectorAll("ul.header--navigation-list").forEach((ul) => {
    ul.innerHTML = nav.map((it) => navItemHtml(it, locale)).join("");
    ul.setAttribute("data-kn-nav-injected", "1");
  });

  doc.querySelectorAll(".no-js-menu nav > ul").forEach((ul) => {
    ul.innerHTML = nav
      .map((it) => {
        const links = it.columns?.flatMap((c) => c.links) ?? it.children ?? [];
        const sub =
          links.length > 0
            ? `<ul>${links.map((l) => `<li><a href="${escAttr(l.href)}">${escText(l.label)}</a></li>`).join("")}</ul>`
            : "";
        return `<li><a class="header--menu-link" href="${escAttr(it.href)}">${escText(it.label)}</a>${sub}</li>`;
      })
      .join("");
  });

  const mobileHtml = buildMobileNavItemsHtml(nav, locale);
  doc.querySelectorAll("ul.mobile-menu--list").forEach((ul) => {
    ul.innerHTML = mobileHtml;
    ul.classList.add("kn-mobile-nav-synced");
    ul.setAttribute("data-kn-mobile-nav-injected", "1");
  });

  bindKnNavDropdown(doc);
  bindMobileNavAccordion(doc);
}

function bindMobileNavAccordion(doc: Document) {
  doc.querySelectorAll(".kn-mobile-menu-toggle").forEach((btn) => {
    const el = btn as HTMLButtonElement;
    if (el.dataset.knNavBound === "1") return;
    el.dataset.knNavBound = "1";
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = el.getAttribute("aria-expanded") === "true";
      const panel = el.nextElementSibling as HTMLElement | null;
      el.setAttribute("aria-expanded", open ? "false" : "true");
      if (panel) panel.hidden = open;
      el.closest(".kn-mobile-nav-item")?.classList.toggle("kn-mobile-nav-open", !open);
    });
  });
}
