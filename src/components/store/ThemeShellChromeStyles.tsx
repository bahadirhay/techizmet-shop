"use client";

import "@/app/store-theme.css";
import { FIXES_CSS_VERSION } from "@/lib/mirror-store-ui-fix";

/**
 * Tema kabuğu — ana sayfada yalnızca header/hero için kritik CSS senkron;
 * çekmece, koleksiyon ve animasyon sayfaları render'ı bloklamaz.
 */
const BASE = "/theme/techizmet-shop/cdn/shop/t/5/assets";
const V = "?v=1";

const SYNC_SHEETS = [
  `${BASE}/swiper-bundle.min3e40.css${V}`,
  `${BASE}/base2ff2.css${V}`,
  `${BASE}/componentcd23.css${V}`,
  `${BASE}/theme9bdd.css${V}`,
  `${BASE}/header38c6.css${V}`,
  `${BASE}/footer0e25.css${V}`,
  `${BASE}/announcementf3b9.css${V}`,
  `${BASE}/marquee1a4c.css${V}`,
  `${BASE}/cartcfbd.css${V}`,
] as const;

const HOME_DEFERRED_SHEETS = [
  `${BASE}/animate5756.css${V}`,
  `${BASE}/featured-collection2541.css${V}`,
  `${BASE}/main-collection71f4.css${V}`,
  `${BASE}/testimonialsfb63.css${V}`,
  `${BASE}/account1dbb.css${V}`,
] as const;

const PRODUCT_SYNC_SHEETS = [
  `${BASE}/main-product26e4.css${V}`,
] as const;

function DeferredStylesheet({ href }: { href: string }) {
  return (
    <link
      rel="stylesheet"
      href={href}
      media="print"
      onLoad={(e) => {
        e.currentTarget.media = "all";
      }}
    />
  );
}

function isHomePath(pathname: string): boolean {
  return pathname === "/" || pathname === "";
}

export function ThemeShellChromeStyles({ pathname = "/" }: { pathname?: string }) {
  const home = isHomePath(pathname);
  const isProduct = pathname.startsWith("/products/");

  return (
    <>
      {SYNC_SHEETS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {isProduct
        ? PRODUCT_SYNC_SHEETS.map((href) => <link key={href} rel="stylesheet" href={href} />)
        : home
          ? HOME_DEFERRED_SHEETS.map((href) => <DeferredStylesheet key={href} href={href} />)
          : HOME_DEFERRED_SHEETS.map((href) => <link key={href} rel="stylesheet" href={href} />)}
      <link rel="stylesheet" href="/theme/techizmet-shop/store-bridge.css" />
      <link rel="stylesheet" href={`/theme/techizmet-shop/store-ui-fixes.css?v=${FIXES_CSS_VERSION}`} />
      {home ? (
        <>
          <DeferredStylesheet href="/theme/techizmet-shop/mirror-icons-fix.css?v=4" />
          <DeferredStylesheet href="/theme/techizmet-shop/kn-checkout-embed.css?v=8" />
        </>
      ) : (
        <>
          <link rel="stylesheet" href="/theme/techizmet-shop/mirror-icons-fix.css?v=4" />
          <link rel="stylesheet" href="/theme/techizmet-shop/kn-checkout-embed.css?v=8" />
        </>
      )}
    </>
  );
}
