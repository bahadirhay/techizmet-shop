import {
  applyMirrorBranding,
  installMirrorBrandingGuard,
  type MirrorBranding,
} from "@/lib/mirror-branding-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import { applyMirrorFooter, type MirrorFooterData } from "@/lib/mirror-footer-overlay";
import { applyMirrorHeaderIconsFix } from "@/lib/mirror-header-overlay";
import { applyMirrorLocaleOverlay } from "@/lib/mirror-locale-overlay";
import { installMirrorSwiperQuiet } from "@/lib/mirror-swiper-overlay";
import { installMirrorLayoutQuiet } from "@/lib/mirror-layout-quiet-overlay";
import { ensureMirrorLayoutStyles } from "@/lib/mirror-nav-dropdown-inject";
import { applyMirrorNavigation, rebindMirrorNavDropdown, type MirrorNavItem } from "@/lib/mirror-nav-overlay";

export type MirrorFramePatchOpts = {
  branding?: MirrorBranding;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  locale?: ShopLocale;
};

function isServerProcessedMirror(doc: Document): boolean {
  return !!doc.getElementById("kn-shopify-stub");
}

function hasServerFooter(doc: Document): boolean {
  return doc.documentElement.dataset.knFooterServer === "1";
}

/** Sunucu HTML yeterliyse istemci yaması gerekmez */
export function isMirrorServerReady(doc: Document): boolean {
  return isServerProcessedMirror(doc) && !!doc.getElementById("kn-branding-bootstrap");
}

/** Tüm mirror iframe’lerinde ortak yama (istemci güvenli) */
export function applyMirrorFramePatches(doc: Document, opts: MirrorFramePatchOpts) {
  const serverReady = isMirrorServerReady(doc);
  installMirrorLayoutQuiet(doc);
  ensureMirrorLayoutStyles(doc);

  if (!serverReady) {
    applyMirrorHeaderIconsFix(doc);
    if (opts.branding) {
      applyMirrorBranding(doc, opts.branding);
      installMirrorBrandingGuard(doc, opts.branding);
    }
  }

  /** Admin menüsü — sunucu HTML menüsünü silmeden güncelle */
  if (opts.nav?.length) {
    const serverNav = doc.documentElement.getAttribute("data-kn-nav-server") === "1";
    if (serverNav) rebindMirrorNavDropdown(doc);
    else applyMirrorNavigation(doc, opts.nav, opts.locale ?? "tr");
  }
  if (opts.footer && !hasServerFooter(doc) && !serverReady) applyMirrorFooter(doc, opts.footer);

  if (opts.locale && !isServerProcessedMirror(doc)) {
    applyMirrorLocaleOverlay(doc, opts.locale);
  }

  if (
    !serverReady &&
    !doc.getElementById("kn-swiper-runtime") &&
    !doc.getElementById("kn-swiper-quiet-script")
  ) {
    installMirrorSwiperQuiet(doc);
  }
}

/** Eski mirror dosyaları için yedek — sunucu hazırsa no-op */
export function scheduleMirrorFramePatches(
  getDoc: () => Document | null | undefined,
  opts: MirrorFramePatchOpts,
): () => void {
  const apply = () => {
    const d = getDoc();
    if (!d?.getElementById("MainContent")) return false;
    applyMirrorFramePatches(d, opts);
    return Boolean(opts.nav?.length && d.querySelector("ul.header--navigation-list[data-kn-nav-injected]"));
  };

  const delays = opts.nav?.length ? [0, 120, 400, 1000] : [800];
  const timers: number[] = [];
  for (const ms of delays) {
    timers.push(
      window.setTimeout(() => {
        apply();
      }, ms),
    );
  }

  return () => timers.forEach((t) => window.clearTimeout(t));
}

/** Ana thread’i bloklamadan patch çalıştırır */
export function deferMirrorFrameWork(work: () => void) {
  window.setTimeout(work, 0);
}
