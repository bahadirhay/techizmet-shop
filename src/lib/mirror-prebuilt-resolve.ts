/** Iframe src — prebuild ve sunucu güvenli (server-only paketi yok) */

import {
  buildMirrorIframeSrc,
  prebuiltMirrorPublicUrl,
  rawMirrorPublicUrl,
} from "@/lib/mirror-iframe-src";
import { hasPrebuiltMirrorHtml, isMirrorDevLiveRebuild } from "@/lib/mirror-prebuilt-io";

export function resolveStoreMirrorIframeSrc(
  normalized: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
): string {
  const path = normalized.startsWith("/") ? normalized.slice(1) : normalized;

  if (process.env.NODE_ENV === "production") {
    if (hasPrebuiltMirrorHtml(path)) return prebuiltMirrorPublicUrl(path);
    return rawMirrorPublicUrl(path);
  }

  if (!isMirrorDevLiveRebuild() && hasPrebuiltMirrorHtml(path)) {
    return prebuiltMirrorPublicUrl(path);
  }

  return buildMirrorIframeSrc(path, pageKey, extra);
}

export function resolveMirrorIframeSrc(
  normalized: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
): string {
  return resolveStoreMirrorIframeSrc(normalized, pageKey, extra);
}
