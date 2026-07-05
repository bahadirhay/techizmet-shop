import "server-only";

import { unstable_cache } from "next/cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
} from "@/lib/cache/store-cache";
import { applyAccountDrawerTrHtml } from "@/lib/mirror-account-drawer-locale";
import {
  patchMirrorAccountDrawerNavLinks,
  patchMirrorStoreBridgeAccountDrawer,
} from "@/lib/mirror-account-bridge";
import { patchMirrorStoreBridgeDrawerClickGuard } from "@/lib/mirror-store-bridge-drawer-patch";
import { patchMirrorStoreBridgeNavigation } from "@/lib/mirror-store-bridge-nav-patch";
import { readMirrorPageHtmlForLocale } from "@/lib/mirror-page-html";

export type ThemeShellDrawers = {
  html: string;
  stylesheets: string[];
  storeBridgeJs: string;
};

function extractCustomElement(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "i");
  return html.match(re)?.[0] ?? null;
}

function extractScriptInner(html: string, id: string): string {
  const re = new RegExp(`<script\\s+id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`, "i");
  return html.match(re)?.[1]?.trim() ?? "";
}

function extractStylesheetHrefs(fragment: string): string[] {
  const urls = new Set<string>();
  const re = /<link[^>]+href="([^"]+\.css[^"]*)"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) {
    const href = m[1]?.trim();
    if (href) urls.add(href);
  }
  return [...urls];
}

function extractDrawerStylesheets(html: string): string[] {
  const markers = ["account1dbb.css", "cartcfbd.css", "search053f.css"];
  const urls = new Set<string>();
  const re = /<link[^>]+href="([^"]+\.css[^"]*)"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1]?.trim();
    if (href && markers.some((mark) => href.includes(mark))) urls.add(href);
  }
  return [...urls];
}

function prepareThemeShellHomeHtml(html: string, locale: ShopLocale): string {
  let out = html;
  if (locale === "tr") {
    out = applyAccountDrawerTrHtml(out);
  }
  out = patchMirrorAccountDrawerNavLinks(out);
  out = patchMirrorStoreBridgeNavigation(out);
  out = patchMirrorStoreBridgeAccountDrawer(out);
  out = patchMirrorStoreBridgeDrawerClickGuard(out);
  return out;
}

const THEME_SHELL_DRAWER_CLICK_PATCH = `var drawerTrigger = e.target && e.target.closest ? e.target.closest("[data-behaviour='drawer']") : null;
    if (drawerTrigger) {
      e.preventDefault();
      e.stopPropagation();
      openDrawer(drawerTrigger.getAttribute("data-source") || "");
      return;
    }`;

/** applyNav React header'ı ezer → hydration / tam sayfa yenileme döngüsü */
function patchThemeShellStoreBridgeJs(js: string): string {
  let out = js.replace(
    /if \(d\.nav\) applyNav\(d\.nav\);/g,
    'if (d.nav && document.documentElement.dataset.knNavServer !== "1") applyNav(d.nav);',
  );
  out = out.replace(
    /if \(d\.nav && d\.nav\.length\) applyNav\(d\.nav\);/g,
    'if (d.nav && d.nav.length && document.documentElement.dataset.knNavServer !== "1") applyNav(d.nav);',
  );
  // bindLocale — cur her tıklamada yeniden okunmalı (tek tık dil geçişi)
  out = out.replace(
    /var cur = getLocale\(\);\s*root\.querySelectorAll\("\[data-locale\]"\)\.forEach\(function \(btn\) \{\s*btn\.classList\.toggle\("is-active", btn\.getAttribute\("data-locale"\) === cur\);\s*btn\.addEventListener\("click", function \(\) \{\s*var next = btn\.getAttribute\("data-locale"\);\s*if \(!next \|\| next === cur\) return;/,
    `root.querySelectorAll("[data-locale]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = btn.getAttribute("data-locale");
        var cur = getLocale();
        if (!next || next === cur) return;`,
  );
  if (!out.includes("kn-locale-sync-active")) {
    out = out.replace(
      /root\.dataset\.knBound = "1";/,
      `root.dataset.knBound = "1";
    var syncActive = function () {
      var cur = getLocale();
      root.querySelectorAll("[data-locale]").forEach(function (btn) {
        btn.classList.toggle("is-active", btn.getAttribute("data-locale") === cur);
      });
    };
    syncActive();`,
    );
  }
  if (!out.includes("drawerTrigger")) {
    out = out.replace(
      /document\.addEventListener\("click", function \(e\) \{\s*\n\s*var listSet =/,
      `document.addEventListener("click", function (e) {\n    ${THEME_SHELL_DRAWER_CLICK_PATCH}\n    var listSet =`,
    );
  }
  return `document.documentElement.dataset.knNavServer="1";\n${out}`;
}

function resolveThemeShellDrawersUncached(locale: ShopLocale): ThemeShellDrawers | null {
  const raw = readMirrorPageHtmlForLocale("home", locale);
  if (!raw) return null;

  const html = prepareThemeShellHomeHtml(raw, locale);

  const account = extractCustomElement(html, "account-drawer");
  const cart = extractCustomElement(html, "cart-drawer");
  const search = extractCustomElement(html, "search-drawer");
  if (!account || !cart || !search) return null;

  const drawersHtml = `${account}\n${cart}\n${search}`;
  const stylesheets = [
    ...new Set([...extractDrawerStylesheets(html), ...extractStylesheetHrefs(drawersHtml)]),
  ];
  const storeBridgeJs = patchThemeShellStoreBridgeJs(extractScriptInner(html, "kn-store-bridge"));
  if (!storeBridgeJs) return null;

  return { html: drawersHtml, stylesheets, storeBridgeJs };
}

/** Ana sayfa mirror HTML'den cart/account/search çekmeceleri + kn-store-bridge */
export function resolveThemeShellDrawers(
  siteId: string,
  locale: ShopLocale,
): Promise<ThemeShellDrawers | null> {
  return unstable_cache(
    () => Promise.resolve(resolveThemeShellDrawersUncached(locale)),
    ["theme-shell-drawers-v4", siteId, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeMirrorTag(siteId)],
    },
  )();
}
