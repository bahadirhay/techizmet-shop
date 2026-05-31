import "server-only";

import { unstable_cache } from "next/cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import { loadMirrorFooterDataUncached } from "@/lib/mirror-footer-load";

export { loadMirrorFooterDataUncached } from "@/lib/mirror-footer-load";

export async function loadMirrorFooterData(
  siteId: string,
  locale: ShopLocale,
): Promise<MirrorFooterData> {
  return unstable_cache(
    () => loadMirrorFooterDataUncached(siteId, locale),
    ["mirror-footer", siteId, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId)],
    },
  )();
}
