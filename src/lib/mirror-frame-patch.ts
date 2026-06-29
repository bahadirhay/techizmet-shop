import { applyMirrorLogoUnify } from "@/lib/mirror-logo-unify";
import {
  applyMirrorBranding,
  installMirrorBrandingGuard,
  installMirrorFaviconGuard,
  setMirrorFavicon,
  type MirrorBranding,
} from "@/lib/mirror-branding-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import { applyMirrorFooter, type MirrorFooterData } from "@/lib/mirror-footer-overlay";
import { applyMirrorHeaderIconsFix } from "@/lib/mirror-header-overlay";
import { applyMirrorEnLocaleOverlay } from "@/lib/mirror-en-locale";
import { applyMirrorLocaleOverlay } from "@/lib/mirror-locale-overlay";
import { installMirrorSwiperQuiet } from "@/lib/mirror-swiper-overlay";
import { installMirrorLayoutQuiet } from "@/lib/mirror-layout-quiet-overlay";
import { ensureMirrorLayoutStyles } from "@/lib/mirror-nav-dropdown-inject";
import { ensureMirrorProductImageStyles } from "@/lib/mirror-product-image-inject";
import { applyMirrorAccountDashboardClient } from "@/lib/mirror-account-dashboard-client";
import {
  applyMirrorAccountDrawerClient,
  openAccountDrawer,
  type AccountDrawerForm,
} from "@/lib/mirror-account-drawer-client";
import { KN_LEGACY_STUB_IDS } from "@/lib/mirror-html-shopify-strip";
import { syncMirrorNavigation, type MirrorNavItem } from "@/lib/mirror-nav-overlay";
import { applyMirrorContact, type MirrorContactData } from "@/lib/mirror-contact-overlay";
import { installMirrorStreetFoodBar } from "@/lib/mirror-street-food-bar";
import { applyMirrorIframeHeight } from "@/lib/mirror-iframe-height";
import { revealMirrorImagesInDocument } from "@/lib/mirror-image-reveal";
import { applyMirrorScrollStability } from "@/lib/mirror-scroll-stability";

export type MirrorFramePatchOpts = {
  branding?: MirrorBranding;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  locale?: ShopLocale;
  /** İletişim sayfası harita ayarları */
  contact?: MirrorContactData;
  /** Ana sayfada çekmeceyi aç — ?account=create */
  accountDrawerForm?: AccountDrawerForm;
};

function isServerProcessedMirror(doc: Document): boolean {
  return KN_LEGACY_STUB_IDS.some((id) => !!doc.getElementById(id));
}

/** Sunucu HTML yeterliyse istemci yaması gerekmez */
export function isMirrorServerReady(doc: Document): boolean {
  return isServerProcessedMirror(doc) && !!doc.getElementById("kn-branding-bootstrap");
}

/**
 * Tüm mirror iframe’lerinde ortak yama (istemci güvenli).
 * Ağır DOM işlemleri scheduler.yield() ile 3 gruba bölünmüştür:
 *   1) Layout/stil kurulumu (görsel kritik)
 *   2) Marka/logo/favicon
 *   3) Nav/footer/locale + post-load
 */
export async function applyMirrorFramePatches(doc: Document, opts: MirrorFramePatchOpts): Promise<void> {
  const serverReady = isMirrorServerReady(doc);

  // --- Grup 1: Layout & hesap widget kurulumu (görsel baskı önlenir) ---
  installMirrorLayoutQuiet(doc);
  ensureMirrorLayoutStyles(doc);
  ensureMirrorProductImageStyles(doc);
  applyMirrorAccountDrawerClient(doc, opts.locale);
  applyMirrorAccountDashboardClient(doc);
  if (opts.accountDrawerForm) openAccountDrawer(doc, opts.accountDrawerForm);

  await yieldToMain();

  // --- Grup 2: Marka kimliği (logo, favicon, renk) ---
  applyMirrorHeaderIconsFix(doc);
  if (opts.branding?.logoUrl?.trim()) {
    applyMirrorLogoUnify(doc, opts.branding);
  }
  if (opts.branding?.faviconUrl?.trim()) {
    doc.getElementById("kn-branding-bootstrap")?.remove();
    setMirrorFavicon(doc, opts.branding.faviconUrl);
    installMirrorFaviconGuard(doc, opts.branding.faviconUrl);
  }
  if (!serverReady) {
    if (opts.branding) {
      applyMirrorBranding(doc, opts.branding);
      installMirrorBrandingGuard(doc, opts.branding);
    }
  }

  await yieldToMain();

  // --- Grup 3: Navigasyon, footer, locale, post-load ---
  const locale = opts.locale ?? "tr";
  if (opts.nav?.length) {
    syncMirrorNavigation(doc, opts.nav, locale);
  }
  if (opts.footer) applyMirrorFooter(doc, opts.footer);
  if (opts.contact) applyMirrorContact(doc, opts.contact);

  if (locale === "en") {
    applyMirrorEnLocaleOverlay(doc, locale);
  } else if (opts.locale && !isServerProcessedMirror(doc)) {
    applyMirrorLocaleOverlay(doc, opts.locale);
  }

  if (
    !serverReady &&
    !doc.getElementById("kn-swiper-runtime") &&
    !doc.getElementById("kn-swiper-quiet-script")
  ) {
    installMirrorSwiperQuiet(doc);
  }

  deferMirrorFrameWork(() => installMirrorStreetFoodBar(doc));
  revealMirrorImagesInDocument(doc);
  applyMirrorScrollStability(doc);
  const frame = doc.defaultView?.frameElement as HTMLIFrameElement | null | undefined;
  applyMirrorIframeHeight(frame);
}

/** Eski mirror dosyaları için yedek — sunucu hazırsa no-op */
export function scheduleMirrorFramePatches(
  getDoc: () => Document | null | undefined,
  opts: MirrorFramePatchOpts,
): () => void {
  const apply = () => {
    const d = getDoc();
    if (!d?.getElementById("MainContent")) return;
    void applyMirrorFramePatches(d, opts);
  };

  const delays = opts.nav?.length
    ? [0, 120, 400, 1000, 2000]
    : opts.footer
      ? [0, 200, 800, 2000]
      : [800];
  const timers: number[] = [];
  for (const ms of delays) {
    timers.push(window.setTimeout(apply, ms));
  }

  return () => timers.forEach((t) => window.clearTimeout(t));
}

type SchedulerWithYield = { yield(): Promise<void> };
const _scheduler = typeof window !== "undefined"
  ? (window as unknown as { scheduler?: SchedulerWithYield }).scheduler
  : undefined;

/**
 * Ana thread’i bırakır — scheduler.yield() destekleniyorsa continuation önceliği
 * alır (diğer görevlerin önünde çalışır), aksi hâlde setTimeout(0) ile devam eder.
 */
async function yieldToMain(): Promise<void> {
  if (_scheduler && "yield" in _scheduler) {
    return _scheduler.yield();
  }
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** Ana thread’i bloklamadan patch çalıştırır */
export function deferMirrorFrameWork(work: () => void): void {
  if (_scheduler && "yield" in _scheduler) {
    void _scheduler.yield().then(work);
  } else {
    window.setTimeout(work, 0);
  }
}
