/** Iframe src — prebuild ve sunucu güvenli (server-only paketi yok) */

import {
  mirrorVitrinApiSrc,
  prebuiltMirrorPublicUrl,
} from "@/lib/mirror-iframe-src";
import { hasPrebuiltMirrorHtml, isMirrorDevLiveRebuild } from "@/lib/mirror-prebuilt-io";

/** Hesap / sepet / ödeme — oturuma göre API enjeksiyonu gerekir */
function needsLiveMirrorApi(path: string): boolean {
  return /\/mirror\/(?:account|cart|checkout)\//i.test(path);
}

export function resolveStoreMirrorIframeSrc(
  normalized: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
): string {
  const path = normalized.startsWith("/") ? normalized.slice(1) : normalized;

  if (needsLiveMirrorApi(path)) {
    return mirrorVitrinApiSrc(path, pageKey, extra);
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
