import {
  buildMirrorIframeSrc,
  prebuiltMirrorPublicUrl,
  rawMirrorPublicUrl,
  MIRROR_PREBUILT_PREFIX,
} from "@/lib/mirror-iframe-src";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export { MIRROR_PREBUILT_PREFIX, prebuiltMirrorPublicUrl } from "@/lib/mirror-iframe-src";

export function prebuiltMirrorRel(normalized: string): string {
  const path = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  return `${MIRROR_PREBUILT_PREFIX}/${path}`;
}

export function prebuiltMirrorAbs(normalized: string): string {
  return join(process.cwd(), "public", prebuiltMirrorRel(normalized));
}

export function hasPrebuiltMirrorHtml(normalized: string): boolean {
  return existsSync(prebuiltMirrorAbs(normalized));
}

export async function readPrebuiltMirrorHtml(normalized: string): Promise<string | null> {
  const abs = prebuiltMirrorAbs(normalized);
  if (!existsSync(abs)) return null;
  return readFile(abs, "utf8");
}

/** Production: build sırasında üretilen statik CDN yolu; geliştirmede yerel prebuilt varsa onu kullan */
export function resolveMirrorIframeSrc(
  normalized: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
): string {
  const path = normalized.startsWith("/") ? normalized.slice(1) : normalized;

  if (process.env.NODE_ENV === "production") {
    if (hasPrebuiltMirrorHtml(path)) return prebuiltMirrorPublicUrl(path);
    return rawMirrorPublicUrl(path);
  }

  if (hasPrebuiltMirrorHtml(path)) return prebuiltMirrorPublicUrl(path);

  return buildMirrorIframeSrc(path, pageKey, extra);
}
