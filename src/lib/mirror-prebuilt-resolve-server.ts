import "server-only";

import {
  resolveStoreMirrorIframeSrc,
  type MirrorIframeSrcOpts,
} from "@/lib/mirror-prebuilt-resolve";
import { getMirrorPrebuildTenantSlug } from "@/lib/mirror-prebuilt-tenant-server";
import { ensureStoreTenant } from "@/lib/store-tenant";

/** Sunucu bileşenleri — host tenant ile prebuild uyumunu kontrol eder */
export async function resolveStoreMirrorIframeSrcForRequest(
  normalized: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
  opts?: MirrorIframeSrcOpts,
): Promise<string> {
  const tenant = await ensureStoreTenant();
  const prebuildTenantSlug = await getMirrorPrebuildTenantSlug();
  return resolveStoreMirrorIframeSrc(normalized, pageKey, extra, {
    ...opts,
    siteSlug: tenant.slug,
    prebuildTenantSlug,
  });
}
