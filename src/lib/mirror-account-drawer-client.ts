/** Mirror iframe — hesap çekmecesi (kayıt/giriş sayfasına gitmeden) */

import type { ShopLocale } from "@/lib/i18n/locale";
import { MIRROR_ACCOUNT_DRAWER_LINK_HREF } from "@/lib/mirror-account-bridge";
import { localizeAccountDrawerTr } from "@/lib/mirror-account-drawer-locale";

export type AccountDrawerForm = "login" | "create" | "reset";

function relocateAccountDrawer(doc: Document) {
  const drawer = doc.querySelector('account-drawer[data-drawer="account-drawer"]');
  if (!(drawer instanceof HTMLElement) || drawer.dataset.knRelocated === "1") return;
  drawer.dataset.knRelocated = "1";
  doc.body.appendChild(drawer);
}

export function patchAccountDrawerNavLinks(doc: Document) {
  const drawer = doc.querySelector('[data-drawer="account-drawer"]');
  if (!drawer) return;

  drawer.querySelectorAll('account-event[data-target] a[href]').forEach((a) => {
    if (a instanceof HTMLAnchorElement) a.setAttribute("href", MIRROR_ACCOUNT_DRAWER_LINK_HREF);
  });

  drawer.querySelectorAll('a[href]').forEach((a) => {
    if (!(a instanceof HTMLAnchorElement)) return;
    if (a.closest(".kn-account-logged-in")) return;
    const href = a.getAttribute("href") ?? "";
    if (/^\/account\/(?:register|login|forgot-password)/i.test(href)) {
      a.setAttribute("href", MIRROR_ACCOUNT_DRAWER_LINK_HREF);
    }
    if (/index\.html$/i.test(href) && a.closest("account-event[data-target]")) {
      a.setAttribute("href", MIRROR_ACCOUNT_DRAWER_LINK_HREF);
    }
    if (href === "#" && a.closest("account-event[data-target]")) {
      a.setAttribute("href", MIRROR_ACCOUNT_DRAWER_LINK_HREF);
    }
  });
}

export function switchAccountDrawerForm(doc: Document, target: AccountDrawerForm) {
  const drawer = doc.querySelector('[data-drawer="account-drawer"]');
  if (!drawer) return;

  drawer.querySelectorAll("[data-form],[data-heading]").forEach((item) => {
    item.classList.add("hidden");
    item.classList.remove("active");
    if (item.hasAttribute("data-form")) item.setAttribute("hidden", "");
  });

  const targetForm = drawer.querySelector(`[data-form="${target}"]`);
  const targetHeading = drawer.querySelector(`[data-heading="${target}"]`);
  if (targetForm instanceof HTMLElement) {
    targetForm.classList.remove("hidden");
    targetForm.classList.add("active");
    targetForm.removeAttribute("hidden");
  }
  if (targetHeading instanceof HTMLElement) {
    targetHeading.classList.remove("hidden");
    targetHeading.classList.add("active");
    targetHeading.removeAttribute("hidden");
  }
}

export function openAccountDrawer(doc: Document, form: AccountDrawerForm = "create") {
  relocateAccountDrawer(doc);
  const drawer = doc.querySelector('[data-drawer="account-drawer"]');
  if (!(drawer instanceof HTMLElement)) return;

  doc.querySelectorAll("search-drawer,account-drawer,cart-drawer,mobile-menu,[data-drawer]").forEach((d) => {
    if (d instanceof HTMLElement) {
      d.removeAttribute("open");
      d.classList.remove("active", "is-active", "open", "show");
    }
  });

  drawer.classList.add("show");
  drawer.setAttribute("open", "");
  doc.body.classList.add("overflow-hidden");
  doc.documentElement.classList.add("overflow-hidden");
  switchAccountDrawerForm(doc, form);
}

function bindAccountDrawerOpenTr(doc: Document, locale?: ShopLocale) {
  if (!shouldLocalizeAccountDrawerTr(doc, locale)) return;
  const win = doc.defaultView;
  if (!win || (win as Window & { __knAccountDrawerOpenTr?: number }).__knAccountDrawerOpenTr) return;
  (win as Window & { __knAccountDrawerOpenTr?: number }).__knAccountDrawerOpenTr = 1;

  doc.addEventListener(
    "click",
    (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const trigger = t.closest(
        '[data-source="account-drawer"],[aria-label*="account" i],[aria-label*="hesap" i]',
      );
      if (!trigger) return;
      const drawer = doc.querySelector('[data-drawer="account-drawer"]');
      if (drawer instanceof HTMLElement) delete drawer.dataset.knTrLocalized;
      localizeAccountDrawerTr(doc);
    },
    true,
  );
}

function bindAccountDrawerSwitch(doc: Document) {
  const win = doc.defaultView;
  if (!win || (win as Window & { __knAccountDrawerBound?: number }).__knAccountDrawerBound) return;
  (win as Window & { __knAccountDrawerBound?: number }).__knAccountDrawerBound = 1;

  doc.addEventListener(
    "click",
    (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const ev = t.closest("account-event[data-target]");
      if (!ev || !ev.closest('[data-drawer="account-drawer"]')) return;
      const target = ev.getAttribute("data-target");
      if (target !== "create" && target !== "login" && target !== "reset") return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      switchAccountDrawerForm(doc, target);
    },
    true,
  );
}

function shouldLocalizeAccountDrawerTr(doc: Document, locale?: ShopLocale): boolean {
  if (locale === "tr") return true;
  const lang = doc.documentElement.lang?.toLowerCase() ?? "";
  return lang.startsWith("tr");
}

/** Eski prebuild HTML + canlı DOM — çekmece içi linkler sayfaya gitmesin */
export function applyMirrorAccountDrawerClient(doc: Document, locale?: ShopLocale) {
  if (!doc.querySelector('[data-drawer="account-drawer"]')) return;
  relocateAccountDrawer(doc);
  patchAccountDrawerNavLinks(doc);
  if (shouldLocalizeAccountDrawerTr(doc, locale)) localizeAccountDrawerTr(doc);
  bindAccountDrawerSwitch(doc);
  bindAccountDrawerOpenTr(doc, locale);
}
