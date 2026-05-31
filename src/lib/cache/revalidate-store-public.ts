import "server-only";

import { revalidateTag } from "next/cache";
import {
  storeMirrorTag,
  storeNavTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";

/** Admin kaydı sonrası vitrin önbelleğini temizle */
export function revalidateStorePublicCache(siteId: string, productSlug?: string) {
  revalidateTag(storeSettingsTag(siteId), "max");
  revalidateTag(storeNavTag(siteId), "max");
  revalidateTag(storeMirrorTag(siteId), "max");
  if (productSlug?.trim()) revalidateTag(`product:${productSlug.trim()}`, "max");
}
