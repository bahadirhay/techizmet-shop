import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const MIRROR_PREBUILT_PREFIX = "_mirror-prebuilt";

export function prebuiltMirrorRel(normalized: string): string {
  return `${MIRROR_PREBUILT_PREFIX}/${normalized}`;
}

export function prebuiltMirrorPublicUrl(normalized: string): string {
  return `/${prebuiltMirrorRel(normalized)}`;
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

/** Production’da statik dosya varsa API’yi atla */
export function resolveMirrorIframeSrc(
  normalized: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
): string {
  if (process.env.NODE_ENV === "production" && hasPrebuiltMirrorHtml(normalized)) {
    return prebuiltMirrorPublicUrl(normalized);
  }
  const path = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  const q = new URLSearchParams({ path });
  if (pageKey) q.set("pageKey", pageKey);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v?.trim()) q.set(k, v.trim());
    }
  }
  return `/api/vitrin/mirror?${q.toString()}`;
}
