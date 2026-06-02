/** Diskteki _mirror-prebuilt HTML — prebuild (tsx) ve sunucu; server-only yok */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MIRROR_PREBUILT_PREFIX } from "@/lib/mirror-iframe-src";

export { MIRROR_PREBUILT_PREFIX };

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

export function isMirrorDevLiveRebuild(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.MIRROR_DEV_LIVE === "1";
}

export function preferPrebuiltMirrorHtml(normalized: string): boolean {
  if (isMirrorDevLiveRebuild()) return false;
  if (process.env.NODE_ENV === "production") return true;
  return hasPrebuiltMirrorHtml(normalized);
}
