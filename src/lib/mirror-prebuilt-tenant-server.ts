import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";

const MANIFEST = join(process.cwd(), "public/_mirror-prebuilt/manifest.json");

/** Build sırasında yazılan tenant — prebuild yanlış mağazaya aitse canlı API kullanılır */
export const getMirrorPrebuildTenantSlug = cache(async (): Promise<string | null> => {
  try {
    const raw = await readFile(MANIFEST, "utf8");
    const data = JSON.parse(raw) as { tenantSlug?: string; siteSlug?: string };
    return data.tenantSlug?.trim() || data.siteSlug?.trim() || process.env.STORE_SITE_SLUG?.trim() || null;
  } catch {
    return null;
  }
});
