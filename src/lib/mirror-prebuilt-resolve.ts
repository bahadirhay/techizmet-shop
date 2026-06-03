/** Iframe src — prebuild ve sunucu; node:fs yok (istemci paketine karışmaz) */

import {
  mirrorVitrinApiSrc,
  prebuiltMirrorPublicUrl,
  rawMirrorPublicUrl,
} from "@/lib/mirror-iframe-src";
import { hasPrebuiltMirrorHtml, isMirrorDevLiveRebuild } from "@/lib/mirror-prebuilt-io";

/** Kayıtlı widget varsa statik prebuild yerine canlı API HTML (widget enjeksiyonu) */
export function mirrorIframePrefersLiveApi(opts?: { hasCustomBlocks?: boolean }): boolean {
  return Boolean(opts?.hasCustomBlocks);
}

/** Hesap / sepet — oturuma göre API enjeksiyonu gerekir */
function needsLiveMirrorApi(path: string): boolean {
  return /\/mirror\/(?:account|cart)\//i.test(path);
}

/** Statik public/theme HTML — generate script ile her zaman üretilir */
function isFastStaticMirrorShell(path: string): boolean {
  return /\/mirror\/(?:checkout\/index(?:-tr)?|orders\/track(?:-tr)?)\.html$/i.test(path);
}

export function resolveStoreMirrorIframeSrc(
  normalized: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
  opts?: { hasCustomBlocks?: boolean },
): string {
  const path = normalized.startsWith("/") ? normalized.slice(1) : normalized;

  if (needsLiveMirrorApi(path) || mirrorIframePrefersLiveApi(opts)) {
    return mirrorVitrinApiSrc(path, pageKey, extra);
  }

  if (isFastStaticMirrorShell(path)) {
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
