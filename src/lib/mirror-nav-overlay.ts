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
    ? buildMegaDropdownHtml(it.columns, locale, it.mega, it.products)
    : `<div class="kn-nav-dropdown kn-nav-dropdown--simple" data-kn-nav-dropdown><div class="kn-nav-dropdown__panel"><ul class="kn-nav-dropdown__links">${dropdownLinksHtml(it.children!)}</ul></div></div>`;
  return `<li class="header--menu-item kn-nav-has-dropdown" data-kn-nav-parent><a href="${href}" class="header--menu-link heading-font text-small">${label}</a>${dropdown}</li>`;
}

function ensureMegaHost(doc: Document): HTMLElement {
  let host = doc.getElementById("kn-mega-host");
  if (!host) {
    host = doc.createElement("div");
    host.id = "kn-mega-host";
    host.setAttribute("aria-hidden", "true");
    doc.body.appendChild(host);
  }
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

function cssPx(raw: string): number {
  const n = parseFloat(String(raw ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function headerSeamPx(doc: Document, bar: Element | null): number {
  if (!bar || !doc.defaultView) return 1;
  const bw = parseFloat(doc.defaultView.getComputedStyle(bar).borderBottomWidth);
  return Number.isFinite(bw) && bw > 0 ? bw : 1;
}

function measureHeaderBottom(doc: Document): number {
  let bottom = 0;
  const ann = doc.querySelector(".section-announcement-bar");
  if (ann) {
    const ar = ann.getBoundingClientRect();
    if (ar.height > 0.5) bottom = ar.bottom;
  }
  const bar =
    doc.querySelector("sticky-always.header") ?? doc.querySelector("[data-header-section]");
  const wrap =
    doc.querySelector("[data-header-wrapper]") ?? doc.querySelector(".header--wrapper");
  if (wrap) {
    const wr = wrap.getBoundingClientRect();
    if (wr.height > 0.5) bottom = Math.max(bottom, wr.bottom);
  } else if (bar) {
    const br = bar.getBoundingClientRect();
    if (br.height > 0.5) bottom = Math.max(bottom, br.bottom);
  } else {
    const hdr = doc.querySelector("header.section-header");
    if (hdr) {
      const hr = hdr.getBoundingClientRect();
      if (hr.height > 0.5) bottom = Math.max(bottom, hr.bottom);
    }
  }
  if (bottom > 0.5) return Math.max(0, bottom - headerSeamPx(doc, bar));
  const cs = doc.defaultView?.getComputedStyle(doc.body);
  if (!cs) return 0;
  const annPx =
    cssPx(cs.getPropertyValue("--dynamic_announcement_height")) ||
    cssPx(cs.getPropertyValue("--announcement_height"));
  const hdrPx =
    cssPx(cs.getPropertyValue("--dynamic_header_height")) ||
    cssPx(cs.getPropertyValue("--header_height"));
  return annPx + hdrPx > 0 ? Math.max(0, annPx + hdrPx - 1) : 0;
}

function syncMegaPanelPosition(doc: Document) {
  const topPx = measureHeaderBottom(doc);
  doc.documentElement.style.setProperty("--kn-mega-panel-top", `${topPx}px`);
  const host = doc.getElementById("kn-mega-host");
  if (host) host.style.top = `${topPx}px`;
  const container =
    doc.querySelector(".section-header .container-fullwidth") ??
    doc.querySelector(".header .container-fullwidth");
  if (container) {
    const w = Math.round(container.getBoundingClientRect().width);
    if (w > 0) doc.documentElement.style.setProperty("--kn-mega-content-max", `${w}px`);
  }
}

function bindKnNavDropdown(doc: Document) {
  initMegaPanels(doc);
  syncMegaPanelPosition(doc);
  const win = doc.defaultView;
  if (win && !(win as Window & { __knMegaPosBound?: number }).__knMegaPosBound) {
    (win as Window & { __knMegaPosBound?: number }).__knMegaPosBound = 1;
    win.addEventListener("resize", () => {
      closeMobileDrawerOnDesktop(doc);
      initMegaPanels(doc);
      syncMegaPanelPosition(doc);
    });
    const mq = win.matchMedia("(min-width: 992px)");
    const onMq = () => {
      closeMobileDrawerOnDesktop(doc);
      initMegaPanels(doc);
      syncMegaPanelPosition(doc);
    };
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onMq);
    else if (typeof mq.addListener === "function") mq.addListener(onMq);
    win.addEventListener("scroll", () => syncMegaPanelPosition(doc), true);
    const roTargets = doc.querySelectorAll(
      ".section-announcement-bar, header.section-header, sticky-always.header, [data-announcement-wrapper]",
    );
    if (typeof ResizeObserver !== "undefined" && roTargets.length) {
      const ro = new ResizeObserver(() => syncMegaPanelPosition(doc));
      roTargets.forEach((el) => ro.observe(el));
    }
    win.requestAnimationFrame(() => syncMegaPanelPosition(doc));
    win.setTimeout(() => syncMegaPanelPosition(doc), 120);
  }

  const open = (el: HTMLElement) => {
    syncMegaPanelPosition(doc);
    setActiveMega(doc, el);
    doc.body.classList.add("kn-nav-dropdown-open");
    el.classList.add("kn-nav-open");
  };
  const close = (el: HTMLElement) => {
    el.classList.remove("kn-nav-open");
    if (!doc.querySelector(".kn-nav-has-dropdown.kn-nav-open")) {
      doc.body.classList.remove("kn-nav-dropdown-open");
      clearActiveMega(doc);
    }
  };

  const megaHost = doc.getElementById("kn-mega-host");
  if (megaHost && megaHost.dataset.knHostBound !== "1") {
    megaHost.dataset.knHostBound = "1";
    megaHost.addEventListener("mouseleave", (e) => {
      const openLi = doc.querySelector(".kn-nav-has-dropdown.kn-nav-open") as HTMLElement | null;
      if (!openLi) return;
      if (e.relatedTarget instanceof Node && openLi.contains(e.relatedTarget)) return;
      close(openLi);
    });
  }

  doc.querySelectorAll(".kn-nav-has-dropdown").forEach((li) => {
    const el = li as HTMLElement;
    if (el.dataset.knNavBound === "1") return;
    el.dataset.knNavBound = "1";
    el.addEventListener("mouseenter", () => open(el));
    el.addEventListener("mouseleave", (e) => {
      if (megaHost && e.relatedTarget instanceof Node && megaHost.contains(e.relatedTarget)) return;
      close(el);
    });
  });
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
