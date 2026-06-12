import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";

const MANIFEST = join(process.cwd(), "public/_mirror-prebuilt/manifest.json");

/** Build sırasında yazılan tenant — prebuild yanlış mağazaya aitse canlı API kullanılır */
export const getMirrorPrebuildTenantSlug = cache(async (): Promise<string | null> => {
  try {
    const raw = await readFile(MANIFEST, "utf8");
    const data = JSON.parse(raw) as { tenantSlug?: string };
    return data.tenantSlug?.trim() || process.env.STORE_SITE_SLUG?.trim() || null;
  } catch {
    return null;
  }
});

export function mirrorPrebuildMatchesTenant(requestSlug: string, prebuildSlug: string | null): boolean {
  if (!prebuildSlug) return false;
  return prebuildSlug === requestSlug;
}
