import "server-only";

import {
  getCachedParsedSiteSettings,
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import { unstable_cache } from "next/cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import { parseHTML } from "@/lib/linkedom-server";
import { resolveProductMirrorSourceRel } from "@/lib/mirror-html-path";
import { injectMirrorProductFavoritesBridge } from "@/lib/mirror-product-favorites-bridge";
import { buildMirrorHtml } from "@/lib/mirror-html-build";
import { injectMirrorProductCommerceHtml } from "@/lib/mirror-product-commerce";
import { loadMirrorProductCommerce } from "@/lib/mirror-product-commerce-server";
import { loadMirrorProductFramePayload } from "@/lib/mirror-product-frame-server";
import type { MirrorBreadcrumbItem } from "@/lib/mirror-product-breadcrumb";
import {
  applyProductDetailFromAdmin,
  ensureProductMediaZoomFix,
} from "@/lib/mirror-product-detail-sync";
import { applyProductContentOverlay } from "@/lib/mirror-product-overlay";
import { applyProductReviewsToDocument } from "@/lib/mirror-product-reviews-inject";
import {
  applyProductPageBottomOverlay,
  getProductPageBottomSettings,
} from "@/lib/product-page-bottom";
import { enhanceMarqueeSectionsInDocument } from "@/lib/marquee-section-enhance";
import { applyExploreLooksOverlay } from "@/lib/product-explore-looks";
import { getApprovedReviews, getReviewStats } from "@/lib/reviews/service";
import { adaptMirrorInlineScriptForThemeShell } from "@/lib/product-media-zoom-fix";

function inlineScriptCollectKey(code: string): string {
  const trimmed = code.trim();
  if (trimmed.includes("const showFilters")) return "kn-theme-locale-strings";
  if (trimmed.includes("window.theme") && trimmed.includes("ON_CHANGE_DEBOUNCE_TIMER")) {
    return "kn-theme-window-config";
  }
  return `${trimmed.length}:${trimmed.slice(0, 160)}:${trimmed.slice(-80)}`;
}

export type ThemeShellProductScript =
  | { kind: "external"; src: string }
  | { kind: "inline"; code: string };

export type ThemeShellProductContent = {
  mainHtml: string;
  stylesheets: string[];
  headStyles: string[];
  scripts: ThemeShellProductScript[];
};

const THEME_MOTOR_SCRIPT_ID = new Set([
  "kn-product-commerce",
  "kn-product-favorites-bridge",
  "kn-product-media-zoom-fix-script",
  "kn-product-gallery-reinit",
  "kn-revealing-static-guard",
  "kn-swiper-runtime",
]);

const THEME_SHELL_HEAD_STYLE_IDS = new Set([
  "kn-mirror-breadcrumb-style",
  "kn-hide-product-price",
  "kn-revealing-static-style",
  "kn-pdp-bottom-critical",
]);

const adaptInlineScriptForThemeShell = adaptMirrorInlineScriptForThemeShell;

/** iframe'e özel scriptleri ele; tema motoru + zoom + commerce scriptlerini koru */
function shouldSkipScript(el: Element): boolean {
  const type = (el.getAttribute("type") || "").toLowerCase();
  if (type === "application/json" || type === "application/ld+json") return true;
  if (el.hasAttribute("nomodule")) return true;

  const id = el.getAttribute("id") || "";
  // Zoom script client bundle'dan yüklenir (RSC payload boyutu + hydration)
  if (id === "kn-product-media-zoom-fix-script") return true;
  if (THEME_MOTOR_SCRIPT_ID.has(id)) return false;

  if (id === "kn-store-bridge") return true;
  if (id.startsWith("kn-mirror")) return true;

  const src = el.getAttribute("src") || "";
  if (src.includes("mirror-embed-boot")) return true;
  if (src.includes("/cdn/shop/t/")) return false;

  const code = el.textContent || "";
  if (/window\.parent|\.contentWindow|postMessage\s*\(/.test(code)) return true;

  // Header/menü custom element'leri React kabuğunda zaten var
  if (!src && /customElements\.define\s*\(\s*['"](?:announcement-bar|header-menu|mobile-menu|hamburger-menu|sticky-on-scroll|account-event)/.test(code)) {
    return true;
  }

  // Body sonundaki window.theme / routes yapılandırması
  if (!src && el.parentElement?.tagName === "BODY") {
    if (
      code.includes("window.theme") ||
      code.includes("window.routes") ||
      code.includes("PUB_SUB_EVENTS") ||
      code.includes("showFilters") ||
      code.includes("atcLoaderSVG")
    ) {
      return false;
    }
  }

  return !src;
}

function extractStylesheetsFromMainHtml(mainHtml: string): string[] {
  const urls = new Set<string>();
  const re = /<link[^>]+href="([^"]+\.css[^"]*)"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mainHtml))) {
    const href = m[1]?.trim();
    if (href) urls.add(href);
  }
  return [...urls];
}

function extractHeadStyles(document: Document): string[] {
  const styles: string[] = [];
  for (const el of Array.from(document.head.querySelectorAll("style"))) {
    const id = el.getAttribute("id") || "";
    if (id.startsWith("kn-product-") || THEME_SHELL_HEAD_STYLE_IDS.has(id)) {
      const text = el.textContent?.trim();
      if (text) styles.push(text);
    }
  }
  return styles;
}

function collectThemeShellScripts(document: Document): ThemeShellProductScript[] {
  const scripts: ThemeShellProductScript[] = [];
  const seenExternal = new Set<string>();
  const seenInline = new Set<string>();

  for (const el of Array.from(document.querySelectorAll("script"))) {
    // Ürün JSON / ld+json — MainContent içinde kalsın (varyant verisi)
    if (el.closest("#MainContent")) continue;

    if (shouldSkipScript(el)) continue;
    const src = el.getAttribute("src");
    if (src) {
      if (seenExternal.has(src)) continue;
      seenExternal.add(src);
      scripts.push({ kind: "external", src });
    } else {
      const code = el.textContent || "";
      if (!code.trim()) continue;
      const inlineKey = inlineScriptCollectKey(code);
      if (seenInline.has(inlineKey)) continue;
      seenInline.add(inlineKey);
      scripts.push({ kind: "inline", code: adaptInlineScriptForThemeShell(code) });
    }
    el.remove();
  }
  return scripts;
}

/** Vitrin/ana sayfa — body scriptleri (swiper, window.theme, …) */
export function collectThemeShellVitrinScripts(document: Document): ThemeShellProductScript[] {
  return collectThemeShellScripts(document);
}

type ThemeShellProductShell = Omit<ThemeShellProductContent, never>;

/** Önbellekli PDP gövdesi — fiyat/stok hariç */
async function buildThemeShellProductShell(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  slug: string,
  locale: ShopLocale,
): Promise<ThemeShellProductShell | null> {
  const source = resolveProductMirrorSourceRel(slug, locale);
  if (!source) return null;

  const settings = await getCachedParsedSiteSettings(siteId);

  let html = await buildMirrorHtml({
    normalized: source.rel,
    locale,
    siteId,
    siteName,
    tenantSlug,
    productSlug: slug,
  });
  html = injectMirrorProductFavoritesBridge(html);

  const framePayload = await loadMirrorProductFramePayload(siteId, slug, locale);

  const { document } = parseHTML(html);
  const main = document.getElementById("MainContent");
  if (!main) return null;

  const bottomSettings =
    framePayload?.productPageBottom ?? getProductPageBottomSettings(settings, locale);

  if (framePayload) {
    applyProductDetailFromAdmin(document, framePayload.productFromAdmin, {
      templateSlug: source.templateSlug ?? undefined,
    });
    applyProductContentOverlay(document, framePayload.overlay);
    applyExploreLooksOverlay(
      document,
      framePayload.exploreLooks,
      framePayload.exploreProductsBySlug,
    );
  } else {
    ensureProductMediaZoomFix(document);
  }

  applyProductPageBottomOverlay(document, bottomSettings);
  enhanceMarqueeSectionsInDocument(document);
  document.getElementById("kn-mirror-breadcrumb")?.remove();

  const productId = framePayload?.productFromAdmin?.productId;
  if (productId) {
    const [stats, approved] = await Promise.all([
      getReviewStats(productId),
      getApprovedReviews(productId, 30),
    ]);
    applyProductReviewsToDocument(
      document,
      { count: stats.count, average: stats.average },
      approved,
    );
  }

  document.documentElement.setAttribute("data-kn-product-sync", "1");
  document.getElementById("kn-product-sync-guard")?.remove();

  const mainHtml = document.getElementById("MainContent")?.innerHTML?.trim();
  if (!mainHtml) return null;

  const scripts = collectThemeShellScripts(document);
  const headStyles = extractHeadStyles(document);

  return {
    mainHtml,
    stylesheets: extractStylesheetsFromMainHtml(mainHtml),
    headStyles,
    scripts,
  };
}

function getCachedThemeShellProductShell(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  slug: string,
  locale: ShopLocale,
): Promise<ThemeShellProductShell | null> {
  return unstable_cache(
    () => buildThemeShellProductShell(siteId, siteName, tenantSlug, slug, locale),
    ["theme-shell-product-shell-v1", siteId, tenantSlug, slug, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId), "store-products"],
    },
  )();
}

function applyCommerceToProductShell(
  shell: ThemeShellProductShell,
  commerce: NonNullable<Awaited<ReturnType<typeof loadMirrorProductCommerce>>>,
): ThemeShellProductContent {
  const headStyleBlock = shell.headStyles.map((css) => `<style>${css}</style>`).join("");
  let html = `<!DOCTYPE html><html><head>${headStyleBlock}</head><body><main id="MainContent" class="content-for-layout focus-none">${shell.mainHtml}</main></body></html>`;
  html = injectMirrorProductCommerceHtml(html, commerce);

  const { document } = parseHTML(html);
  const mainHtml = document.getElementById("MainContent")?.innerHTML?.trim() ?? shell.mainHtml;
  const commerceScript = document.getElementById("kn-product-commerce")?.textContent?.trim();
  const hidePriceStyle = document.getElementById("kn-hide-product-price")?.textContent?.trim();

  const scripts = shell.scripts.filter((script) => {
    if (script.kind !== "inline") return true;
    return !script.code.includes("kn-product-commerce") && !script.code.includes("DATA.productId");
  });

  if (hidePriceStyle) {
    scripts.unshift({ kind: "inline", code: hidePriceStyle });
  }
  if (commerceScript) {
    scripts.push({ kind: "inline", code: commerceScript });
  }

  return {
    mainHtml,
    stylesheets: extractStylesheetsFromMainHtml(mainHtml),
    headStyles: shell.headStyles,
    scripts,
  };
}

/** Ürün PDP — iframe ile aynı zengin HTML kaynağı */
async function buildThemeShellProductContent(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  slug: string,
  locale: ShopLocale,
  _breadcrumbs: MirrorBreadcrumbItem[],
): Promise<ThemeShellProductContent | null> {
  const shell = await getCachedThemeShellProductShell(
    siteId,
    siteName,
    tenantSlug,
    slug,
    locale,
  );
  if (!shell) return null;

  const settings = await getCachedParsedSiteSettings(siteId);
  const commerce = await loadMirrorProductCommerce(siteId, slug, locale, settings.store?.texts);
  if (!commerce) return shell;

  return applyCommerceToProductShell(shell, commerce);
}

/** Ürün PDP — iframe'siz tam işlev (galeri, varyant, sepete ekle) */
export function resolveThemeShellProductContent(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  slug: string,
  locale: ShopLocale,
  breadcrumbs: MirrorBreadcrumbItem[],
): Promise<ThemeShellProductContent | null> {
  return buildThemeShellProductContent(
    siteId,
    siteName,
    tenantSlug,
    slug,
    locale,
    breadcrumbs,
  );
}
