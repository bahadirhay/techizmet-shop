/** Iframe src — prebuild ve sunucu; node:fs yok (istemci paketine karışmaz) */

import {
  mirrorVitrinApiSrc,
  prebuiltMirrorPublicUrl,
  rawMirrorPublicUrl,
} from "@/lib/mirror-iframe-src";
import { hasPrebuiltMirrorHtml, isMirrorDevLiveRebuild } from "@/lib/mirror-prebuilt-io";
import { mirrorPrebuildMatchesTenant } from "@/lib/mirror-prebuilt-tenant-shared";

export type MirrorIframeSrcOpts = {
  hasCustomBlocks?: boolean;
  /** Admin mirror düzenlemeleri (hero grid, metin vb.) */
  hasMirrorEdits?: boolean;
  /** Üst duyuru şeridi ayarı kaydedildiyse prebuild yerine canlı HTML */
  hasAnnouncementBarSettings?: boolean;
  /** Logo/görsel /uploads veya /api/media — prebuild enjekte etmez */
  hasCustomBranding?: boolean;
  /** Prebuild başka mağazaya aitse canlı API */
  siteSlug?: string;
  prebuildTenantSlug?: string | null;
  forceLiveApi?: boolean;
};

/** Prebuild yokken canlı API — deploy öncesi prebuild tüm overlay/fiyat/markayı içerir */
export function mirrorIframePrefersLiveApi(opts?: MirrorIframeSrcOpts): boolean {
  return Boolean(
    opts?.hasCustomBlocks ||
      opts?.hasMirrorEdits ||
      opts?.hasCustomBranding ||
      opts?.hasAnnouncementBarSettings,
  );
}

function preferPrebuiltWhenAvailable(path: string): boolean {
  return hasPrebuiltMirrorHtml(path) && !isMirrorDevLiveRebuild();
}

/** Hesap auth/favoriler — oturuma göre API; sepet artık prebuild + /api/cart hidrasyon */
function needsLiveMirrorApi(path: string): boolean {
  if (/\/mirror\/account\/(?:index|favorites|login|register|forgot-password)/i.test(path)) return true;
  return false;
}

/** Statik / prebuild kabuk — sepet ve ödeme içerik API ile doldurulur */
function isFastStaticMirrorShell(path: string): boolean {
  return /\/mirror\/(?:cart\/index(?:-tr)?|checkout\/index(?:-tr)?|orders\/track(?:-tr)?)\.html$/i.test(
    path,
  );
}

export function resolveStoreMirrorIframeSrc(
  normalized: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
  opts?: MirrorIframeSrcOpts,
): string {
  const path = normalized.startsWith("/") ? normalized.slice(1) : normalized;

  if (
    opts?.forceLiveApi ||
    opts?.siteSlug === "demo" ||
    (opts?.siteSlug &&
      opts.prebuildTenantSlug !== undefined &&
      !mirrorPrebuildMatchesTenant(opts.siteSlug, opts.prebuildTenantSlug ?? null))
  ) {
    return mirrorVitrinApiSrc(path, pageKey, extra);
  }

  if (extra?.cmsSlug?.trim()) {
    return mirrorVitrinApiSrc(path, pageKey, extra);
  }

  if (needsLiveMirrorApi(path)) {
    return mirrorVitrinApiSrc(path, pageKey, extra);
  }

  if (mirrorIframePrefersLiveApi(opts)) {
    return mirrorVitrinApiSrc(path, pageKey, extra);
  }

  if (preferPrebuiltWhenAvailable(path)) {
    return prebuiltMirrorPublicUrl(path);
  }

  if (isFastStaticMirrorShell(path)) {
    if (hasPrebuiltMirrorHtml(path)) return prebuiltMirrorPublicUrl(path);
    if (/\/mirror\/cart\//i.test(path)) {
      return mirrorVitrinApiSrc(path, pageKey, extra);
    }
    return rawMirrorPublicUrl(path);
  }

  if (process.env.NODE_ENV === "production") {
    if (hasPrebuiltMirrorHtml(path)) return prebuiltMirrorPublicUrl(path);
    return mirrorVitrinApiSrc(path, pageKey, extra);
  }

  if (!isMirrorDevLiveRebuild() && hasPrebuiltMirrorHtml(path)) {
    return prebuiltMirrorPublicUrl(path);
  }

  return mirrorVitrinApiSrc(path, pageKey, extra);
}

export function resolveMirrorIframeSrc(
  normalized: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
): string {
  return resolveStoreMirrorIframeSrc(normalized, pageKey, extra);
}

